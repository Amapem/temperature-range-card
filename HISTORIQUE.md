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

### 🏷️ Version 4.1.3 — Correctifs Écran Noir Lovelace, Assainissement `[object Object]`, Épuration & Synthèses Dynamiques (17/11/2026)
* 📊 **Fiabilisation des vues Semaines, Mois et Années pour les nouveaux capteurs & consignes** :
  * **Constat initial (Retour utilisateur consigne thermostat)** :
    * Sur un nouveau capteur de consigne de thermostat, l'affichage en jour fonctionnait parfaitement mais les vues en semaines (10 semaines), mois ou années restaient bloquées sur le texte littéral brut `${localize("loading", this._hass)}`.
  * **Causes racines identifiées** :
    1. **Bogue d'interpolation JavaScript** : Le fallback de `rows-container` utilisait des apostrophes simples `'` au lieu de backticks `` ` ``, affichant la chaîne de template littérale au lieu du message localisé.
    2. **Dépendance exclusive aux statistiques LTS (`recorder/statistics_during_period`)** : Pour les semaines, mois et années, la carte ne construisait des lignes que si l'API recorder renvoyait un tableau non vide. Or, pour un nouveau capteur ou une entité sans l'attribut `state_class: measurement` (comme de nombreuses consignes de thermostat ou template sensors), Home Assistant ne calcule aucune statistique à long terme, retournant un tableau vide !
    3. **Absence de la période courante en direct** : Même si le capteur avait une valeur actuelle valide (ex: 20°C de consigne), la semaine en cours, le mois en cours et l'année en cours n'étaient pas générés si aucune statistique historique fermée n'était présente dans la base.
  * **Solution technique & Optimisations** :
    1. **Injection proactive de la période en cours** : Pour les semaines ISO, mois et années, la carte intègre systématiquement la période actuelle en direct avec la température ou consigne temps réel (`cur.state`), garantissant que la ligne en cours s'affiche immédiatement même pour un capteur créé il y a 5 minutes.
    2. **Agrégation journalière pour les semaines ISO** : Les requêtes hebdomadaires s'appuient désormais sur les statistiques journalières (`period: "day"`) et l'historique brut des 7 derniers jours (`history/period`), universellement supportés et agrégés côté frontend par numéro de semaine ISO.
    3. **Notification explicite d'absence de LTS** : Remplacement du chargement infini par un message propre d'information guidant l'utilisateur sur la nécessité de l'attribut `state_class: measurement` dans Home Assistant pour l'historique étendu.
* 🎛️ **Épuration de l'éditeur visuel & Mémorisation de session cloisonnée par carte** :
  * **Constat & Choix utilisateur** :
    * L'utilisateur souhaite conserver la dernière vue consultée lors du rechargement de la page (rester sur le capteur et la durée choisis pendant la session).
    * Pour éviter le piège des conflits entre plusieurs cartes, la mémorisation a été refondue : elle génère désormais un identifiant unique par carte (`trc_<hash>_entity` et `trc_<hash>_period`).
    * Plusieurs cartes sur le même dashboard conservent désormais chacune leur propre sélection indépendante sans jamais interférer.
    * L'éditeur visuel reste épuré (sans les sélecteurs redondants) : le 1er capteur et la 1ère durée de la liste servent d'état initial lors de la toute première consultation.
* 🐛 **Résolution de l'écran noir lors de l'ajout d'une carte dans un dashboard** :
  * **Constat initial (Retour utilisateur Discord)** :
    * Lors de l'ajout de la carte dans un tableau de bord Home Assistant, le panneau d'aperçu de droite reste totalement noir / vide.
    * Même en ajoutant un capteur valide (ex : capteur extérieur de pompe à chaleur Kronoterm), rien ne s'affiche.
    * Le premier capteur et le sélecteur "Capteur par défaut" affichaient le texte corrompu `[object Object]`.
  * **Causes racines identifiées** :
    1. **Blocage fatal dans `set hass(hass)`** : La méthode contenait la garde `const cur = hass.states[this._selectedEntity]; if (!cur) return;`. Lorsque la carte venait d'être ajoutée ou si le premier capteur sélectionné n'existait pas encore dans `hass.states` (ou était corrompu), `set hass` retournait silencieusement sans jamais exécuter `this._render()`. Le Shadow DOM restait alors 100% vide, laissant la prévisualisation dans le noir complet. Même le bel écran d'aide *"Aucun capteur configuré"* ne pouvait pas apparaître !
    2. **Absence de repli automatique (Fallback)** : Si le capteur sélectionné par défaut était invalide ou introuvable, la carte restait bloquée dessus et refusait de basculer vers les autres capteurs valides pourtant ajoutés par l'utilisateur (comme le capteur Kronoterm).
    3. **Corruption `[object Object]` dans l'éditeur** : Lorsqu'une entité était passée sous forme d'objet complexe (ex : clé standard `entity_id` au lieu de `entity`, objet imbriqué ou événement UI non déstructuré), l'absence d'assainissement strict produisait une conversion en chaîne brute `String(object) = "[object Object]"`, polluant `this._config.default_entity` et la liste des entités.
    4. **Déconnexion de `getStubConfig`** : `getStubConfig` ignorait la liste des entités sélectionnées par l'utilisateur dans l'onglet "Par entité" de Lovelace et initialisait toujours un tableau vide avec un titre en dur en français.
  * **Solution technique & Optimisations** :
    1. **Suppression du blocage dans `set hass(hass)` & Premier rendu garanti** :
       - `this._render()` est systématiquement appelé si la carte n'a pas encore été rendue (`!this._isCardRendered`) ou si aucune entité n'est configurée, garantissant l'affichage immédiat de l'interface et du message d'aide chaleureux avec le thermomètre 🌡️.
       - Si l'entité sélectionnée n'est pas trouvée dans `hass.states`, la carte recherche automatiquement dans `_entitiesList` le premier capteur valide présent dans `hass.states` et bascule dessus de manière transparente.
    2. **Fonctions universelles d'assainissement (`extractEntityId`, `extractEntityName`, `normalizeEntities`)** :
       - Extraction propre de l'identifiant d'entité quelle que soit la source (`entity`, `entity_id`, `value`, `id`, ou objet imbriqué).
       - Élimination stricte des chaînes fantômes `"[object Object]"`, `"undefined"`, `"null"`.
       - Remplacement automatique du libellé par `Capteur #N` si aucun nom ni entité n'est encore renseigné, éliminant tout affichage de `[object Object]`.
    3. **Synchronisation automatique de `default_entity`** :
       - Dès que l'utilisateur renseigne ou modifie un capteur, si `default_entity` était vide ou invalide, elle s'aligne automatiquement sur ce nouveau capteur.
       - En cas de suppression d'un capteur (`delete`), `default_entity` se réaligne immédiatement sur les capteurs valides restants.
    4. **`getStubConfig` intelligent & proactif** :
       - Détecte prioritairement l'entité de température sélectionnée par l'utilisateur dans Lovelace.
       - À défaut, recherche et sélectionne automatiquement la première sonde de température active trouvée dans Home Assistant (`device_class: temperature` ou unité `°C`/`°F`).
       - Initialise dynamiquement le titre de la carte selon la langue de l'utilisateur (`card_title_default`).
       - Résultat : dès le clic sur "+ Ajouter une carte", la carte s'affiche déjà préconfigurée, fonctionnelle et animée sans écran noir.

---

### 🏷️ Version 4.1.2 — Correctifs Transition Heure d'Hiver (DST) & Stabilité Éditeur Visuel (17/11/2026)
* 🐛 **Résolution de la perte de focus et des modifications successives dans l'éditeur visuel Lovelace** :
  * **Constat initial (Retour Forum HACF & Tests)** : 
    1. Perte du focus après chaque lettre tapée dans les champs de saisie (titre de carte, nom de capteur).
    2. Blocage des modifications suivantes : seule la première modification était enregistrée, les modifications ultérieures dans d'autres champs étaient ignorées.
  * **Causes racines identifiées** :
    1. **Destruction du Shadow DOM** : L'événement `input` déclenchait `config-changed` qui rappelait `setConfig()`, exécutant inconditionnellement `this._render()` (`innerHTML = ...`), détruisant l'élément actif du DOM.
    2. **Immutabilité et égalité de référence dans Home Assistant / LitElement** : `_fireConfigChanged()` transmettait la même référence d'objet mutée (`detail: { config: this._config }`). Lors de la première modification, Home Assistant adoptait cette référence. Aux modifications suivantes, l'égalité stricte `oldConfig === newConfig` dans Home Assistant amenait le système à croire qu'aucun changement n'avait eu lieu, ignorant toutes les modifications suivantes !
  * **Solution technique & Optimisations** :
    1. **Clonage systématique de la configuration (`structuredClone(this._config)`)** : Garantit une nouvelle référence d'objet distincte à chaque événement émis, forçant Home Assistant à prendre en compte chaque modification successive sans exception.
    2. **Synchronisation transparente de l'état sans destruction du DOM** : Dans `setConfig()`, si un champ est actif (`activeElement`), l'état interne `this._config` est synchronisé sans jamais détruire le DOM ni interrompre l'utilisateur.
    3. **Architecture d'événements propre (`input` pour le rendu local, `change`/`blur` pour Lovelace)** :
       - Pendant la frappe, `input` actualise immédiatement la valeur locale et le titre du bandeau de l'accordéon en direct sans émettre vers Lovelace, éliminant tout conflit asynchrone.
       - Dès la validation (Entrée, changement de champ ou clic "Enregistrer"), `change` et `blur` transmettent la valeur finale stabilisée.
    4. **Indicateurs d'épaisseur fluides** : Le réglage de l'épaisseur des barres (`bar_height`) met à jour dynamiquement les badges et le label en temps réel sans reconstruction du DOM.
    5. **Sauvegarde et restauration automatique du focus** : Mémorisation de l'élément actif (`activeElement`) et de la position exacte du curseur (`selectionStart`/`selectionEnd`) avant tout rendu structurel.
* 🐛 **Résolution de la duplication du dernier dimanche d'octobre (changement d'heure / DST)** :
  * **Constat** : Sur la vue 30 jours, le dimanche 25/10 (jour du passage à l'heure d'hiver en Europe) apparaissait en double : une ligne complète avec données (`15.9°` / `16.6°`) suivie d'une seconde ligne vide fantôme (`--°`).
  * **Cause racine** : La boucle d'initialisation des jours utilisait une soustraction de 24 heures fixes en millisecondes (`now.getTime() - i * 24 * 3600 * 1000`). Lors du passage à l'heure d'hiver (journée de 25 heures en UTC), une consultation en fin de soirée (ex: 23h30 CET) faisait atterrir deux itérations consécutives dans la même journée civile du 25 octobre (23h30 CET puis 00h30 CEST).
  * **Solution technique** : Remplacement de l'arithmétique en millisecondes fixes par la manipulation de dates calendaires locales natives (`targetDate.setDate(now.getDate() - i)`).
  * **Fiabilisation des requêtes Recorder** : Calage de la date de départ des statistiques (`dStatsStart.setHours(0, 0, 0, 0)`) pour garantir la couverture intégrale du premier jour demandé, indépendamment de toute variation de fuseau ou transition horaire.

---

### 🏷️ Version 4.1.1 — Nettoyage de l'alias et élimination de la DOMException Lovelace (16/11/2026)
* 🐛 **Résolution de l'erreur `CustomElementRegistry` (`DOMException`)** :
  * Résolution définitive de l'erreur *"Failed to execute 'define' on 'CustomElementRegistry': this constructor has already been used with this registry"* rapportée par OUARZA sur le forum HACF.
  * **Arbitrage technique** : Refus délibéré de conserver un alias ou de cloner le constructeur Web Component. Retour à un nommage unique, standard et pérenne : `custom:temperature-range-card`.
  * Suppression totale de l'alias redondant `temperature-history-range-card` dans le code et la documentation, éliminant tout risque de conflit dans le scoped-registry de Home Assistant.
  * Conservation intégrale du titre affiché officiel *"Temperature History & Range Card"* dans l'interface et le sélecteur Lovelace.

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
