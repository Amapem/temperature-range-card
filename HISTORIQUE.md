# 📜 Historique Chronologique — Temperature History & Range Card

Ce document retrace l'historique complet de conception, des choix d'architecture, des retours de la communauté et des versions successives de la carte Lovelace **Temperature History & Range Card**.

---

## 🌟 Genèse du Projet

* **Constat initial** : Dans Home Assistant, le suivi de l'historique des températures repose traditionnellement sur des graphiques de courbes (History Graph, ApexCharts, Mini Graph Card). Dès que plusieurs sondes ou plusieurs jours sont affichés, les courbes sinusoïdales s'entrecroisent et deviennent difficiles à lire rapidement.
* **Inspiration** : L'ergonomie épurée de l'application **Apple Météo (iOS)**, où chaque période est résumée par une barre horizontale d'amplitude thermique (du plus froid au plus chaud), complétée par un repère de température actuelle en direct.
* **Philosophie technique** : 
  * **Zéro dépendance externe** : Composant Web Vanilla (`HTMLElement`, Shadow DOM) ultra-léger et rapide.
  * **Intégration HACS native** : Compatible dépôt personnalisé puis marketplace officielle.
  * **Multi-langues (i18n)** : Adaptation automatique à la langue de l'utilisateur.

---

## 📅 Chronologie des Versions & Évolutions

### 🏷️ Version 3.0.0 — Sortie Initiale & Éditeur Visuel (14/11/2026)
* **Éditeur Visuel Lovelace** : Création de la classe `TemperatureRangeCardEditor` permettant de configurer la carte entièrement sans passer par le code YAML.
* **Échelle Graduée** : Affichage d'une échelle de repères au-dessus des barres avec bornes Min, repères intermédiaires calculés dynamiquement et Max, alignés avec des guides verticaux discrets sur les barres.
* **Esthétique Apple Weather** : Barres d'amplitudes colorées et intégration des entités de température.

---

### 🏷️ Version 3.1.0 — Durées Personnalisées Libres (`<N>d`, `<N>w`, `<N>m`) (14/11/2026)
* **Périodes dynamiques** : Remplacement des durées rigides par un moteur de parsing regex (`^(\d+)([dwm])$`) acceptant n'importe quelle durée :
  * Jours : `1d`, `2d`, `7d`, `10d`, `14d`, `15d`, `30d`...
  * Semaines : `1w`, `2w`, `4w`, `8w`, `10w`, `20w`... (regroupement par numéro de semaine ISO).
  * Mois : `1m`, `3m`, `6m`, `12m`, `24m`... (vagues saisonnières sur plusieurs années).
* **Interface éditeur à puces (Chips)** : Gestion interactive des périodes actives avec suppression 1-clic (`✕`), suggestions rapides et ajout de durées personnalisées à la volée.

---

### 🏷️ Version 3.1.1 — Tri Chronologique & Détection Réelle du Point Heure Fixe (14/11/2026)
* **Tri Chronologique Universel** : Fonction `sortPeriods()` assurant que les menus déroulants et les puces s'ordonnent toujours rigoureusement du plus court au plus long (Jours croissants ➔ Semaines croissantes ➔ Mois croissants).
* **Fiabilisation des Points Heure Fixe** : Détection dynamique de la durée de rétention réelle de l'historique brut SQLite de Home Assistant (`lu` timestamps) pour n'afficher le point de comparaison à heure fixe que lorsque la donnée existe réellement, évitant l'affichage de points fantômes.

---

### 🏷️ Version 4.0.0 — Sortie Majeure : i18n, Gradient Continu & Refonte Complète (14/11/2026)
* 🌍 **Internationalisation Native (i18n)** :
  * Détection automatique de la langue de Home Assistant (`hass.locale.language`).
  * Traduction intégrale dans **6 langues** : Anglais (`en`), Français (`fr`), Allemand (`de`), Espagnol (`es`), Italien (`it`), Néerlandais (`nl`).
  * Formatage dynamique multilingue des dates et mois selon la locale active.
* 🍏 **Dégradé Continu Global (Style Apple Weather)** :
  * `gradient_mode: global` (par défaut) : Les couleurs s'alignent sur la position physique de l'échelle thermique absolue. Une même température (ex: 18°C) conserve exactement la même teinte été comme hiver sur toutes les lignes.
  * Option `gradient_mode: local` conservée pour les amplitudes relatives individuelles.
* 🏷️ **En-têtes Explicites MIN et MAX** :
  * Ajout de libellés clairs **MIN** et **MAX** au-dessus des colonnes de valeurs numériques.
* 📏 **Épaisseur des Barres & Typographie Proportionnelle (`bar_height`)** :
  * Réglage libre de la hauteur des barres de `6px` à `60px` (défaut `18px`) avec 6 presets dans l'éditeur.
  * Adaptation automatique de la taille des polices de caractères, des marges et des interlignes (gain jusqu'à **45% de compacité** en hauteur avec le mode fin `10px`).
* 🗂️ **Refonte Ultra-Compacte de l'Éditeur avec Glisser-Déposer (≡)** :
  * Hauteur de l'éditeur réduite de plus de 50% via une grille responsive 2 colonnes.
  * Lignes de capteurs amincies à 28px avec poignée de glisser-déposer HTML5 native (`≡`) pour réordonner les capteurs en toute fluidité.
  * Boutons rapides *« Tout déplier / Tout replier »*.
* 🧹 **Gabarit Initial Propre & Filtre Strict** :
  * La création d'une nouvelle carte démarre sans capteur résiduel polluant (`entities: []`).
  * Le sélecteur d'entités filtre rigoureusement les vrais capteurs de température (`device_class: temperature` ou unités °C/°F), excluant les compteurs de durée ou d'uptime.

---

### 🏷️ Version 4.0.1 — Rebranding & Clarification « History » (15/11/2026)
* **Nouveau Nom Officiel** : La carte est renommée **`Temperature History & Range Card`** (dans `hacs.json`, le sélecteur Lovelace et le README) pour souligner sa capacité unique de suivi et d'analyse d'historique thermique.
* **Alias Rétrocompatible** : Enregistrement de l'alias `custom:temperature-history-range-card` tout en préservant à 100% `custom:temperature-range-card`.
* **Publication & Visibilité Communautaire** :
  * Partage sur le forum francophone **HACF**, et les serveurs Discord **MakerMix** et **Abrège**.
  * Premières étoiles GitHub et adoption immédiate par la communauté.

---

### 🏷️ Version 4.1.1 — Nettoyage de l'alias et élimination de la DOMException Lovelace (16/11/2026)
* 🐛 **Résolution de l'erreur `CustomElementRegistry` (`DOMException`)** :
  * Résolution définitive de l'erreur *"Failed to execute 'define' on 'CustomElementRegistry': this constructor has already been used with this registry"* rapportée par OUARZA sur le forum HACF.
  * Suppression de l'alias redondant `temperature-history-range-card` pour ne conserver qu'un composant unique et universel : `custom:temperature-range-card`.
  * Élimination de tout conflit dans le registre scoped de Home Assistant tout en préservant le nom affiché complet *"Temperature History & Range Card"* dans Lovelace.

---

### 🏷️ Version 4.1.0 — Badge T° Actuelle en Direct & Périodes Annuelles (`<N>y`) (16/11/2026)
* 🌡️ **Badge de Température Actuelle en Direct (`show_current`)** :
  * Réponse directe à une suggestion de Gilles (forum HACF) : affichage de la température en direct en grand format (ex: `11.9°C`).
  * Disposition responsive sur 2 niveaux façon **Apple Météo** : le titre et la température sur la ligne du haut, les sélecteurs de pièces et de durées sur leur propre ligne en dessous, évitant tout chevauchement sur smartphone ou dashboards denses.
  * Option activable/désactivable directement dans l'éditeur visuel (*« Afficher la température actuelle en direct dans l'en-tête »*).
  * Réactivité immédiate : bascule instantanée de la valeur au changement de pièce dans le menu déroulant.
* 📆 **Périodes Annuelles Pluriannuelles (`<N>y`, ex: `1y`, `2y`, `3y`, `5y`...)** :
  * Nouveau mode d'agrégation permettant de comparer des années civiles complètes entre elles (`2026 (En cours)`, `2025`, `2024`...).
  * Agrégation optimisée à partir des statistiques mensuelles du recorder.
  * Ajout de l'icône `📆` et intégration dans l'ordre de tri : Jours (📅) ➔ Semaines (🗓️) ➔ Mois (🗓️) ➔ Années (📆).
* ⚪ **Harmonisation Globale du Point Blanc de Référence** :
  * Activation du repère météo en temps réel sur la première barre en cours de chaque type de période (**Jour**, **Semaine**, **Mois**, **Année**).

---

## 🏛️ Isolation & Autonomie du Projet (16/11/2026)

* **Extraction du projet** : Déplacement complet depuis `D:\Antigravity\HomeAssistant\temperature-range-card-repo` vers un dossier de premier niveau :  
  📁 **`D:\Antigravity\temperature-range-card`**
* **Outillage Dédié** :
  * Création de `scripts/deploy_dev.py` : automatisation du test local direct sur Home Assistant (build dist, validation syntaxique, déploiement SCP `haos`, gzip et invalidation de cache via WebSocket) pour tester sans polluer GitHub.
  * Création de `AGENTS.md` et `GEMINI.md` formalisant le contexte, l'architecture et la règle stricte de validation utilisateur avant toute publication externe.
