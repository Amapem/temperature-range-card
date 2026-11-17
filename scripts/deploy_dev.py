#!/usr/bin/env python3
"""
Déploiement local et rechargement à chaud (Hot-Reload Dev) de la carte Lovelace sur Home Assistant (haos).
1. Synchronise dist/temperature-range-card.js
2. Valide la syntaxe JavaScript
3. Déploie sur haos via SCP et compresse en .gz
4. Actualise le cache Lovelace via WebSocket API
"""

import sys
import os
import shutil
import subprocess
import time
import json
import asyncio

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
SRC_JS = os.path.join(ROOT_DIR, "temperature-range-card.js")
DIST_JS = os.path.join(ROOT_DIR, "dist", "temperature-range-card.js")
SSH_CONFIG = os.path.join(ROOT_DIR, ".ssh", "config")
TOKEN_FILE = os.path.join(ROOT_DIR, ".ssh", "ha_token")

HA_IP = "192.168.0.241"
HA_PORT = 8123
RESOURCE_ID = "215210753d7c4ef5b848457bde0abe7f"

def main():
    print("[*] 1. Copie vers dist/...")
    os.makedirs(os.path.dirname(DIST_JS), exist_ok=True)
    shutil.copy2(SRC_JS, DIST_JS)

    print("[*] 2. Validation de la syntaxe JS...")
    with open(SRC_JS, "rb") as f:
        js_data = f.read()
    check = subprocess.run(
        ["ssh", "-F", SSH_CONFIG, "haserver", "docker run --rm -i node:alpine node -c"],
        input=js_data, capture_output=True
    )
    if check.returncode != 0:
        print("[-] Erreur de syntaxe JS:", check.stderr.decode("utf-8", errors="replace"))
        sys.exit(1)
    print("    -> Syntaxe JS 100% valide.")

    print("[*] 3. Déploiement sur haos via SCP...")
    scp_res = subprocess.run([
        "scp", "-F", SSH_CONFIG,
        SRC_JS,
        "haos:/config/www/community/temperature-range-card/temperature-range-card.js"
    ], capture_output=True, text=True)
    if scp_res.returncode != 0:
        print("[-] Erreur SCP:", scp_res.stderr)
        sys.exit(1)

    print("[*] 4. Compression .gz sur haos...")
    subprocess.run([
        "ssh", "-F", SSH_CONFIG, "haos",
        "gzip -c -9 /config/www/community/temperature-range-card/temperature-range-card.js > /config/www/community/temperature-range-card/temperature-range-card.js.gz"
    ], capture_output=True, text=True)

    print("[*] 5. Invalidation du cache Lovelace via WebSocket...")
    if os.path.exists(TOKEN_FILE):
        token = open(TOKEN_FILE, "r", encoding="utf-8").read().strip()
        try:
            import websockets
            async def bump_cache():
                uri = f"ws://{HA_IP}:{HA_PORT}/api/websocket"
                async with websockets.connect(uri) as ws:
                    await ws.recv() # auth_required
                    await ws.send(json.dumps({"type": "auth", "access_token": token}))
                    auth = await ws.recv()
                    ts = int(time.time())
                    new_url = f"/local/community/temperature-range-card/temperature-range-card.js?v=dev-{ts}"
                    req = {
                        "id": 1,
                        "type": "lovelace/resources/update",
                        "resource_id": RESOURCE_ID,
                        "url": new_url
                    }
                    await ws.send(json.dumps(req))
                    res = json.loads(await ws.recv())
                    if res.get("success"):
                        print(f"    -> Cache Lovelace rechargé avec succès (?v=dev-{ts})")
                    else:
                        print("    [-] Réponse WebSocket:", res)
            asyncio.run(bump_cache())
        except Exception as e:
            print("    [!] Avertissement WebSocket:", e)

    print("\n[+] Déploiement local terminé avec succès ! Fais un F5 sur ton dashboard pour tester.")

if __name__ == "__main__":
    main()
