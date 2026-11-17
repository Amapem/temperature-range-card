/**
 * Temperature History & Range Card (Style iOS Weather / Apple Weather)
 * v4.1.2 :
 * - Résolution de la perte de focus et des modifications bloquées dans l'éditeur visuel Lovelace
 * - Découplage des événements de saisie (input direct, change/blur vers Lovelace) et immutabilité (structuredClone)
 * - Mises à jour DOM ciblées et réactives en direct sans destruction du Shadow DOM
 * - Correction du bug de duplication du dernier dimanche d'octobre (changement d'heure / DST)
 *   Remplacement de la soustraction fixe de 24h (86400000ms) par un décalage calendaire strict (setDate)
 *   Résolution des barres fantômes vides (--°) lors des transitions heure d'été / heure d'hiver
 * v4.1.1 :
 * - Suppression de l'alias de balise redondant pour préserver un nom unique strict ('custom:temperature-range-card')
 *   et éliminer toute erreur DOMException / CustomElementRegistry dans Lovelace
 * v4.1.0 :
 * - Affichage élégant de la température actuelle en direct (show_current) façon Apple Weather
 * - Disposition d'en-tête responsive sur 2 niveaux avec badge de température grand format
 * - Option activable/désactivable directement dans l'éditeur visuel Lovelace
 * - Prise en charge des périodes annuelles (<N>y, ex: 1y, 2y, 3y, 5y) avec regroupement par année civile
 * - Tri chronologique étendu (Jours -> Semaines -> Mois -> Années)
 * v4.0.0 (Global Release) :
 * - Internationalisation native complète (i18n) dans 6 langues :
 *   - English (en), Français (fr), Deutsch (de), Español (es), Italiano (it), Nederlands (nl)
 *   - Détection automatique de la langue utilisateur via Home Assistant (hass.locale.language)
 *   - Formatage des dates dynamique multilingue (toLocaleDateString avec la locale active)
 * - Typographie et espacements adaptatifs selon l'épaisseur des barres (gain jusqu'à 45% en hauteur)
 * - En-têtes de colonnes clairs et explicites MIN et MAX au-dessus des températures
 * - Dégradé Continu Global (Style Apple Weather) avec alignement vertical parfait
 * - Épaisseur des barres 100% personnalisable et libre (bar_height)
 * - Éditeur visuel Lovelace ultra-compact (hauteur réduite de plus de 50%)
 * - Liste des capteurs repliable (28px) avec réorganisation native par Glisser-Déposer (Drag & Drop)
 * - Création de carte vierge sans capteur résiduel polluant et filtrage strict des températures
 * - Tri chronologique automatique et manuel des durées (Jours -> Semaines -> Mois)
 * - Détection dynamique réelle de la rétention recorder pour les points comparatifs
 * - Zéro dépendance : Vanilla Web Components natif ultra rapide
 * - Dégradé Continu Global (Style Apple Weather) avec alignement vertical parfait :
 *   - Mode 'global' (défaut) : une température donnée a toujours la même couleur sur toutes les lignes et sous l\'échelle
 *   - Mode 'local' (optionnel) : chaque barre déroule toute la palette de son min à son max
 *   - Sélecteur direct dans l\'éditeur visuel
 * - Épaisseur des barres 100% personnalisable et libre (bar_height) :
 *   - Valeur libre en pixels (ex: 6 à 60 px, défaut 18px)
 *   - 6 Presets rapides dans l\'éditeur : 10px Fine, 14px Standard, 18px Défaut, 24px Épaisse, 28px Très épaisse, 34px Extra large
 *   - Dimensionnement adaptatif et proportionnel des repères et puces temporelles
 * - v3.1.1 :
 * - Tri chronologique automatique et manuel des durées (Jours -> Semaines -> Mois par ordre croissant) :
 *   - 1. Jours croissants (ex: 2d, 7d, 10d, 14d, 15d, 20d, 30d, 60d)
 *   - 2. Semaines croissantes (ex: 1w, 4w, 8w, 10w, 20w, 52w)
 *   - 3. Mois croissants (ex: 3m, 6m, 12m, 24m)
 * - Bouton "⇅ Trier" dans l'éditeur visuel et tri automatique lors de l'ajout
 * - Tri automatique du menu déroulant dans la carte principale
 * - Détection dynamique réelle de la limite d'historique pour le point "Même heure" :
 *   - Utilise l'historique brut réel de la base sans limite arbitraire
 *   - Affiche le point tant que la base dispose de données réelles (10-11 jours selon rétention recorder)
 *   - S'estompe naturellement dès que les données brutes ont été purgées
 * - Durées entièrement personnalisables et dynamiques (<nombre><unité>)
 * - Éditeur visuel interactif complet (TemperatureRangeCardEditor)
 * - Échelle des températures graphique alignée au pixel près avec guides verticaux
 * - Zéro dépendance : Vanilla Web Components natif ultra rapide
 */

function getISOWeekNumber(d) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil((((date - yearStart) / 86400000) + 1) / 7);
}

function parsePeriod(periodStr) {
  if (!periodStr) return { count: 10, unit: "d", raw: "10d" };
  const str = String(periodStr).trim().toLowerCase();
  if (str === "week") return { count: 20, unit: "w", raw: "20w" };
  if (str === "month") return { count: 12, unit: "m", raw: "12m" };
  if (str === "year") return { count: 1, unit: "y", raw: "1y" };
  const match = str.match(/^(\d+)([dwmy])$/);
  if (match) {
    return {
      count: parseInt(match[1], 10),
      unit: match[2],
      raw: str
    };
  }
  return { count: 10, unit: "d", raw: "10d" };
}

// =============================================================================
// INTERNATIONALISATION (i18n) - 6 LANGUES : EN, FR, DE, ES, IT, NL
// =============================================================================

const TRANSLATIONS = {
  en: {
    card_title_default: "Temperature Overview",
    subtitle_days: "History and comparison for the last {count} days",
    subtitle_weeks: "Weekly summary for the last {count} weeks",
    subtitle_months: "Monthly summary for the last {count} months (Seasonal trends)",
    scale: "Scale",
    today: "Today",
    yesterday: "Yesterday",
    current_temp: "Current temp",
    same_time: "Same time past days",
    loading: "Loading historical data...",
    no_sensors_title: "No sensor configured",
    no_sensors_desc: "Click <strong>Edit</strong> to add your temperature sensors.",
    period_d_single: "1 day",
    period_d_plural: "{count} days",
    period_w_single: "1 week",
    period_w_plural: "{count} weeks",
    period_m_single: "1 month",
    period_m_plural: "{count} months",
    period_y_single: "1 year",
    period_y_plural: "{count} years",
    subtitle_years: "Annual summary for the last {count} years",
    subtitle_year_single: "Annual summary for the current year",
    in_progress: "Current",
    general_settings: "⚙️ General Settings",
    card_title_label: "Card title",
    card_title_placeholder: "Ex: Temperature Overview",
    default_sensor: "Default sensor",
    default_period: "Default period",
    no_sensor_option: "(No sensor)",
    bar_style_section: "📊 Bar Style & Display",
    show_scale_label: "Display graduated scale above bars (Min, Ticks, Max)",
    show_current_label: "Display real-time current temperature in header",
    gradient_style_label: "Bar gradient style",
    gradient_global: "🍏 Continuous global scale (Apple Weather style - vertical alignment)",
    gradient_local: "🌈 Relative amplitude per bar (Each bar 0% to 100%)",
    bar_thickness_label: "Bar thickness",
    thickness_fine: "fine",
    thickness_standard: "standard",
    thickness_default: "default",
    thickness_thick: "thick",
    thickness_max: "max",
    thickness_xxl: "xxl",
    active_periods_section: "⏱️ Active periods ({count})",
    sort: "⇅ Sort",
    quick_suggestions: "Quick suggestions",
    all_added: "All added.",
    add_custom_placeholder: "Custom duration: 15d, 8w, 6m...",
    add_button: "+ Add",
    sensors_section: "🌡️ Temperature Sensors ({count})",
    expand_all: "Expand all",
    collapse_all: "Collapse all",
    no_sensors_configured: "No sensors configured. Click below to add your first sensor.",
    add_sensor: "+ Add a sensor",
    move_up: "Move up",
    move_down: "Move down",
    delete_sensor: "Delete this sensor",
    expand: "Expand",
    collapse: "Collapse",
    drag_handle_title: "Drag to reorder",
    ha_entity: "Home Assistant Entity (Sensor)",
    custom_name: "Custom display name",
    custom_name_placeholder: "Ex: 🌳 Outdoor, 🛋️ Living room..."
  },
  fr: {
    card_title_default: "Comparatif & Amplitudes Thermiques",
    subtitle_days: "Historique et comparatif sur les {count} derniers jours",
    subtitle_weeks: "Synthèse hebdomadaire des {count} dernières semaines",
    subtitle_months: "Synthèse mensuelle des {count} derniers mois (Évolution des saisons)",
    scale: "Échelle",
    today: "Auj.",
    yesterday: "Hier",
    current_temp: "T° actuelle",
    same_time: "Même heure les jours passés",
    loading: "Chargement des données historiques...",
    no_sensors_title: "Aucun capteur configuré",
    no_sensors_desc: "Cliquez sur <strong>Modifier</strong> pour ajouter vos capteurs.",
    period_d_single: "1 jour",
    period_d_plural: "{count} jours",
    period_w_single: "1 semaine",
    period_w_plural: "{count} semaines",
    period_m_single: "1 mois",
    period_m_plural: "{count} mois",
    period_y_single: "1 an",
    period_y_plural: "{count} ans",
    subtitle_years: "Synthèse annuelle des {count} dernières années",
    subtitle_year_single: "Synthèse annuelle de l'année en cours",
    in_progress: "En cours",
    general_settings: "⚙️ Paramètres Généraux",
    card_title_label: "Titre de la carte",
    card_title_placeholder: "Ex: Comparatif & Amplitudes Thermiques",
    default_sensor: "Capteur par défaut",
    default_period: "Période par défaut",
    no_sensor_option: "(Aucun capteur)",
    bar_style_section: "📊 Style & Affichage des Barres",
    show_scale_label: "Afficher l'échelle graduée au-dessus des barres (Min, Repères, Max)",
    show_current_label: "Afficher la température actuelle en direct dans l'en-tête",
    gradient_style_label: "Style de dégradé des barres",
    gradient_global: "🍏 Échelle continue globale (Style Apple Weather - alignement vertical)",
    gradient_local: "🌈 Amplitude relative par barre (Chaque barre de 0% à 100%)",
    bar_thickness_label: "Épaisseur des barres",
    thickness_fine: "fine",
    thickness_standard: "standard",
    thickness_default: "défaut",
    thickness_thick: "épaisse",
    thickness_max: "max",
    thickness_xxl: "xxl",
    active_periods_section: "⏱️ Durées actives ({count})",
    sort: "⇅ Trier",
    quick_suggestions: "Suggestions rapides",
    all_added: "Toutes ajoutées.",
    add_custom_placeholder: "Durée libre : 15d, 8w, 6m...",
    add_button: "+ Ajouter",
    sensors_section: "🌡️ Capteurs Thermiques ({count})",
    expand_all: "Déplier tout",
    collapse_all: "Replier tout",
    no_sensors_configured: "Aucun capteur configuré. Cliquez ci-dessous pour ajouter votre premier capteur.",
    add_sensor: "+ Ajouter un capteur",
    move_up: "Monter",
    move_down: "Descendre",
    delete_sensor: "Supprimer ce capteur",
    expand: "Déplier",
    collapse: "Replier",
    drag_handle_title: "Glisser pour changer l'ordre",
    ha_entity: "Entité Home Assistant (Capteur)",
    custom_name: "Nom d'affichage personnalisé",
    custom_name_placeholder: "Ex: 🌳 T° Extérieure, 🛋️ Salon..."
  },
  de: {
    card_title_default: "Temperaturübersicht & Amplituden",
    subtitle_days: "Verlauf und Vergleich der letzten {count} Tage",
    subtitle_weeks: "Wochenübersicht der letzten {count} Wochen",
    subtitle_months: "Monatsübersicht der letzten {count} Monate (Jahreszeiten)",
    scale: "Skala",
    today: "Heute",
    yesterday: "Gestern",
    current_temp: "Aktuelle Temp.",
    same_time: "Gleiche Zeit vergangene Tage",
    loading: "Historische Daten laden...",
    no_sensors_title: "Kein Sensor konfiguriert",
    no_sensors_desc: "Klicken Sie auf <strong>Bearbeiten</strong>, um Sensoren hinzuzufügen.",
    period_d_single: "1 Tag",
    period_d_plural: "{count} Tage",
    period_w_single: "1 Woche",
    period_w_plural: "{count} Wochen",
    period_m_single: "1 Monat",
    period_m_plural: "{count} Monate",
    period_y_single: "1 Jahr",
    period_y_plural: "{count} Jahre",
    subtitle_years: "Jahresübersicht der letzten {count} Jahre",
    subtitle_year_single: "Jahresübersicht des aktuellen Jahres",
    in_progress: "Laufend",
    general_settings: "⚙️ Allgemeine Einstellungen",
    card_title_label: "Kartentitel",
    card_title_placeholder: "Z.B.: Temperaturübersicht",
    default_sensor: "Standard-Sensor",
    default_period: "Standard-Zeitraum",
    no_sensor_option: "(Kein Sensor)",
    bar_style_section: "📊 Balkenstil & Anzeige",
    show_scale_label: "Graduierte Skala über den Balken anzeigen (Min, Markierungen, Max)",
    show_current_label: "Aktuelle Echtzeit-Temperatur im Header anzeigen",
    gradient_style_label: "Balken-Farbverlauf",
    gradient_global: "🍏 Durchgehende globale Skala (Apple Weather Stil - vertikale Ausrichtung)",
    gradient_local: "🌈 Relativer Verlauf pro Balken (Jeder Balken von 0% bis 100%)",
    bar_thickness_label: "Balkendicke",
    thickness_fine: "fein",
    thickness_standard: "standard",
    thickness_default: "standard",
    thickness_thick: "dick",
    thickness_max: "max",
    thickness_xxl: "xxl",
    active_periods_section: "⏱️ Aktive Zeiträume ({count})",
    sort: "⇅ Sortieren",
    quick_suggestions: "Schnellvorschläge",
    all_added: "Alle hinzugefügt.",
    add_custom_placeholder: "Eigener Zeitraum: 15d, 8w, 6m...",
    add_button: "+ Hinzufügen",
    sensors_section: "🌡️ Temperatursensoren ({count})",
    expand_all: "Alle ausklappen",
    collapse_all: "Alle einklappen",
    no_sensors_configured: "Keine Sensoren konfiguriert. Unten klicken, um den ersten Sensor hinzuzufügen.",
    add_sensor: "+ Sensor hinzufügen",
    move_up: "Nach oben",
    move_down: "Nach unten",
    delete_sensor: "Diesen Sensor löschen",
    expand: "Ausklappen",
    collapse: "Einklappen",
    drag_handle_title: "Ziehen zum Neuanordnen",
    ha_entity: "Home Assistant Entität (Sensor)",
    custom_name: "Benutzerdefinierter Anzeigename",
    custom_name_placeholder: "Z.B.: 🌳 Außen, 🛋️ Wohnzimmer..."
  },
  es: {
    card_title_default: "Resumen y Amplitudes Térmicas",
    subtitle_days: "Historial y comparación de los últimos {count} días",
    subtitle_weeks: "Resumen semanal de las últimas {count} semanas",
    subtitle_months: "Resumen mensual de los últimos {count} meses (Evolución estacional)",
    scale: "Escala",
    today: "Hoy",
    yesterday: "Ayer",
    current_temp: "T° actual",
    same_time: "Misma hora días anteriores",
    loading: "Cargando datos históricos...",
    no_sensors_title: "Sin sensores configurados",
    no_sensors_desc: "Haga clic en <strong>Editar</strong> para añadir sensores.",
    period_d_single: "1 día",
    period_d_plural: "{count} días",
    period_w_single: "1 semana",
    period_w_plural: "{count} semanas",
    period_m_single: "1 mes",
    period_m_plural: "{count} meses",
    period_y_single: "1 año",
    period_y_plural: "{count} años",
    subtitle_years: "Resumen anual de los últimos {count} años",
    subtitle_year_single: "Resumen anual del año en curso",
    in_progress: "En curso",
    general_settings: "⚙️ Configuración General",
    card_title_label: "Título de la tarjeta",
    card_title_placeholder: "Ej: Resumen Térmico",
    default_sensor: "Sensor predeterminado",
    default_period: "Período predeterminado",
    no_sensor_option: "(Sin sensor)",
    bar_style_section: "📊 Estilo y Visualización de Barras",
    show_scale_label: "Mostrar escala graduada sobre las barras (Mín, Marcas, Máx)",
    show_current_label: "Mostrar temperatura actual en tiempo real en el encabezado",
    gradient_style_label: "Estilo de gradiente",
    gradient_global: "🍏 Escala continua global (Estilo Apple Weather - alineación vertical)",
    gradient_local: "🌈 Amplitud relativa por barra (Cada barra de 0% a 100%)",
    bar_thickness_label: "Grosor de las barras",
    thickness_fine: "fina",
    thickness_standard: "estándar",
    thickness_default: "predeterminado",
    thickness_thick: "gruesa",
    thickness_max: "máx",
    thickness_xxl: "xxl",
    active_periods_section: "⏱️ Períodos activos ({count})",
    sort: "⇅ Ordenar",
    quick_suggestions: "Sugerencias rápidas",
    all_added: "Todas añadidas.",
    add_custom_placeholder: "Duración personalizada: 15d, 8w, 6m...",
    add_button: "+ Añadir",
    sensors_section: "🌡️ Sensores de Temperatura ({count})",
    expand_all: "Desplegar todo",
    collapse_all: "Plegar todo",
    no_sensors_configured: "No hay sensores configurados. Haga clic abajo para añadir su primer sensor.",
    add_sensor: "+ Añadir un sensor",
    move_up: "Subir",
    move_down: "Bajar",
    delete_sensor: "Eliminar este sensor",
    expand: "Desplegar",
    collapse: "Plegar",
    drag_handle_title: "Arrastrar para reordenar",
    ha_entity: "Entidad de Home Assistant (Sensor)",
    custom_name: "Nombre de visualización personalizado",
    custom_name_placeholder: "Ej: 🌳 Exterior, 🛋️ Salón..."
  },
  it: {
    card_title_default: "Panoramica e Amplitudini Termiche",
    subtitle_days: "Cronologia e confronto degli ultimi {count} giorni",
    subtitle_weeks: "Riepilogo settimanale delle ultime {count} settimane",
    subtitle_months: "Riepilogo mensile degli ultimi {count} mesi (Stagionalità)",
    scale: "Scala",
    today: "Oggi",
    yesterday: "Ieri",
    current_temp: "T° attuale",
    same_time: "Stessa ora giorni passati",
    loading: "Caricamento dati storici...",
    no_sensors_title: "Nessun sensore configurato",
    no_sensors_desc: "Clicca su <strong>Modifica</strong> per aggiungere sensori.",
    period_d_single: "1 giorno",
    period_d_plural: "{count} giorni",
    period_w_single: "1 settimana",
    period_w_plural: "{count} settimane",
    period_m_single: "1 mese",
    period_m_plural: "{count} mesi",
    period_y_single: "1 anno",
    period_y_plural: "{count} anni",
    subtitle_years: "Riepilogo annuale degli ultimi {count} anni",
    subtitle_year_single: "Riepilogo annuale dell'anno in corso",
    in_progress: "In corso",
    general_settings: "⚙️ Impostazioni Generali",
    card_title_label: "Titolo della scheda",
    card_title_placeholder: "Es: Panoramica Termica",
    default_sensor: "Sensore predefinito",
    default_period: "Periodo predefinito",
    no_sensor_option: "(Nessun sensore)",
    bar_style_section: "📊 Stile e Visualizzazione Barre",
    show_scale_label: "Mostra scala graduata sopra le barre (Min, Tacche, Max)",
    show_current_label: "Mostra la temperatura attuale in tempo reale nell'intestazione",
    gradient_style_label: "Stile sfumatura barre",
    gradient_global: "🍏 Scala continua globale (Stile Apple Weather - allineamento verticale)",
    gradient_local: "🌈 Ampiezza relativa per barra (Ogni barra da 0% a 100%)",
    bar_thickness_label: "Spessore delle barre",
    thickness_fine: "fine",
    thickness_standard: "standard",
    thickness_default: "predefinito",
    thickness_thick: "spesso",
    thickness_max: "max",
    thickness_xxl: "xxl",
    active_periods_section: "⏱️ Periodi attivi ({count})",
    sort: "⇅ Ordina",
    quick_suggestions: "Suggerimenti rapidi",
    all_added: "Tutti aggiunti.",
    add_custom_placeholder: "Durata libera: 15d, 8w, 6m...",
    add_button: "+ Aggiungi",
    sensors_section: "🌡️ Sensori di Temperatura ({count})",
    expand_all: "Espandi tutto",
    collapse_all: "Comprimi tutto",
    no_sensors_configured: "Nessun sensore configurato. Clicca sotto per aggiungere il primo sensore.",
    add_sensor: "+ Aggiungi sensore",
    move_up: "Sposta su",
    move_down: "Sposta giù",
    delete_sensor: "Elimina questo sensore",
    expand: "Espandi",
    collapse: "Comprimi",
    drag_handle_title: "Trascina per riordinare",
    ha_entity: "Entità Home Assistant (Sensore)",
    custom_name: "Nome di visualizzazione personalizzato",
    custom_name_placeholder: "Es: 🌳 Esterno, 🛋️ Soggiorno..."
  },
  nl: {
    card_title_default: "Temperatuuroverzicht & Amplitudes",
    subtitle_days: "Geschiedenis en vergelijking voor de afgelopen {count} dagen",
    subtitle_weeks: "Wekelijks overzicht voor de afgelopen {count} weken",
    subtitle_months: "Maandelijks overzicht voor de afgelopen {count} maanden (Seizoenen)",
    scale: "Schaal",
    today: "Vandaag",
    yesterday: "Gisteren",
    current_temp: "Huidige temp.",
    same_time: "Zelfde tijd afgelopen dagen",
    loading: "Historische gegevens laden...",
    no_sensors_title: "Geen sensor geconfigureerd",
    no_sensors_desc: "Klik op <strong>Bewerken</strong> om sensoren toe te voegen.",
    period_d_single: "1 dag",
    period_d_plural: "{count} dagen",
    period_w_single: "1 week",
    period_w_plural: "{count} weken",
    period_m_single: "1 maand",
    period_m_plural: "{count} maanden",
    period_y_single: "1 jaar",
    period_y_plural: "{count} jaar",
    subtitle_years: "Jaaroverzicht voor de afgelopen {count} jaar",
    subtitle_year_single: "Jaaroverzicht voor het huidige jaar",
    in_progress: "Lopend",
    general_settings: "⚙️ Algemene Instellingen",
    card_title_label: "Kaarttitel",
    card_title_placeholder: "Bijv.: Temperatuuroverzicht",
    default_sensor: "Standaard sensor",
    default_period: "Standaard periode",
    no_sensor_option: "(Geen sensor)",
    bar_style_section: "📊 Balkstijl & Weergave",
    show_scale_label: "Schaalverdeling boven balken weergeven (Min, Markeringen, Max)",
    show_current_label: "Huidige realtime temperatuur in koptekst weergeven",
    gradient_style_label: "Balkverloopstijl",
    gradient_global: "🍏 Doorlopende globale schaal (Apple Weather stijl - verticale uitlijning)",
    gradient_local: "🌈 Relatief verloop per balk (Elke balk van 0% tot 100%)",
    bar_thickness_label: "Balkdikte",
    thickness_fine: "dun",
    thickness_standard: "standaard",
    thickness_default: "standaard",
    thickness_thick: "dik",
    thickness_max: "max",
    thickness_xxl: "xxl",
    active_periods_section: "⏱️ Actieve perioden ({count})",
    sort: "⇅ Sorteren",
    quick_suggestions: "Snelle suggesties",
    all_added: "Alle toegevoegd.",
    add_custom_placeholder: "Aangepaste duur: 15d, 8w, 6m...",
    add_button: "+ Toevoegen",
    sensors_section: "🌡️ Temperatuursensoren ({count})",
    expand_all: "Alles uitklappen",
    collapse_all: "Alles inklappen",
    no_sensors_configured: "Geen sensoren geconfigureerd. Klik hieronder om je eerste sensor toe te voegen.",
    add_sensor: "+ Sensor toevoegen",
    move_up: "Omhoog",
    move_down: "Omlaag",
    delete_sensor: "Verwijder deze sensor",
    expand: "Uitklappen",
    collapse: "Inklappen",
    drag_handle_title: "Slepen om volgorde te wijzigen",
    ha_entity: "Home Assistant Entiteit (Sensor)",
    custom_name: "Aangepaste weergavenaam",
    custom_name_placeholder: "Bijv.: 🌳 Buiten, 🛋️ Woonkamer..."
  }
};

function localize(key, hass, placeholders = {}) {
  const rawLang = (hass && (hass.locale?.language || hass.language)) || "en";
  const lang = rawLang.toLowerCase().split("-")[0];
  const dict = TRANSLATIONS[lang] || TRANSLATIONS["en"];
  let text = dict[key] || TRANSLATIONS["en"][key] || key;
  for (const [k, v] of Object.entries(placeholders)) {
    text = text.replace(new RegExp(`\\{${k}\\}`, "g"), v);
  }
  return text;
}

function getUserLocale(hass) {
  return (hass && (hass.locale?.language || hass.language)) || "en-US";
}

function formatPeriodLabel(periodStr, hass) {
  const p = parsePeriod(periodStr);
  if (!p) return periodStr;
  const count = p.count;
  const icon = p.unit === "d" ? "📅 " : (p.unit === "y" ? "📆 " : "🗓️ ");
  if (p.unit === "d") {
    const lbl = count === 1 ? localize("period_d_single", hass, { count }) : localize("period_d_plural", hass, { count });
    return `${icon}${lbl}`;
  } else if (p.unit === "w") {
    const lbl = count === 1 ? localize("period_w_single", hass, { count }) : localize("period_w_plural", hass, { count });
    return `${icon}${lbl}`;
  } else if (p.unit === "m") {
    const lbl = count === 1 ? localize("period_m_single", hass, { count }) : localize("period_m_plural", hass, { count });
    return `${icon}${lbl}`;
  } else if (p.unit === "y") {
    const lbl = count === 1 ? localize("period_y_single", hass, { count }) : localize("period_y_plural", hass, { count });
    return `${icon}${lbl}`;
  }
  return periodStr;
}


function sortPeriods(periodList) {
  if (!Array.isArray(periodList)) return [];
  const unitOrder = { d: 1, w: 2, m: 3, y: 4 };
  return [...periodList].sort((a, b) => {
    const pa = parsePeriod(a);
    const pb = parsePeriod(b);
    const orderA = unitOrder[pa.unit] || 99;
    const orderB = unitOrder[pb.unit] || 99;
    if (orderA !== orderB) {
      return orderA - orderB;
    }
    return pa.count - pb.count;
  });
}

// =============================================================================
// ÉDITEUR VISUEL (TemperatureRangeCardEditor)
// =============================================================================

class TemperatureRangeCardEditor extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._config = null;
    this._hass = null;
    this._expandedSet = new Set();
    this._isRendered = false;
  }

  setConfig(config) {
    const newConfig = Object.assign({
      title: "Comparatif & Amplitudes Thermiques",
      default_period: "10d",
      show_scale: true,
      show_current: false,
      gradient_mode: "global",
      bar_height: 18,
      available_periods: ["10d", "20d", "30d", "20w", "12m"],
      entities: []
    }, structuredClone(config));

    if (!Array.isArray(newConfig.available_periods) || newConfig.available_periods.length === 0) {
      newConfig.available_periods = ["10d", "20d", "30d", "20w", "12m"];
    } else {
      newConfig.available_periods = sortPeriods(newConfig.available_periods);
    }

    if (Array.isArray(newConfig.entities)) {
      newConfig.entities = newConfig.entities.map(e => {
        if (typeof e === "string") return { entity: e, name: "" };
        return { entity: e.entity || "", name: e.name || "" };
      });
    } else if (newConfig.entity) {
      newConfig.entities = [{ entity: newConfig.entity, name: newConfig.name || "" }];
    } else {
      newConfig.entities = [];
    }

    // Premier rendu initial
    if (!this._isRendered) {
      this._config = newConfig;
      this._render();
      return;
    }

    // Si la configuration est déjà strictement identique
    if (this._config && JSON.stringify(this._config) === JSON.stringify(newConfig)) {
      this._config = newConfig;
      return;
    }

    // Si un champ de l'éditeur est actuellement en cours de saisie/focus par l'utilisateur,
    // on synchronise l'état interne sans détruire le DOM
    const active = this.shadowRoot.activeElement;
    if (active && (active.tagName === "INPUT" || active.tagName === "SELECT" || active.tagName === "TEXTAREA")) {
      this._config = newConfig;
      return;
    }

    this._config = newConfig;
    this._render();
  }

  set hass(hass) {
    this._hass = hass;
    if (this.shadowRoot) {
      const pickers = this.shadowRoot.querySelectorAll("ha-entity-picker");
      pickers.forEach(p => { p.hass = hass; });
    }
  }

  async connectedCallback() {
    if (!customElements.get("ha-entity-picker")) {
      const Card = customElements.get("hui-entities-card") || customElements.get("hui-glance-card");
      if (Card && Card.getConfigElement) {
        try {
          await Card.getConfigElement();
        } catch (_) {}
      }
      this._render();
    }
  }

  _fireConfigChanged() {
    const event = new CustomEvent("config-changed", {
      detail: { config: structuredClone(this._config) },
      bubbles: true,
      composed: true
    });
    this.dispatchEvent(event);
  }

  _render() {
    if (!this.shadowRoot || !this._config) return;

    // Sauvegarder l'état du focus avant actualisation du DOM
    let focusState = null;
    try {
      const active = this.shadowRoot.activeElement;
      if (active && (active.tagName === "INPUT" || active.tagName === "SELECT" || active.tagName === "TEXTAREA")) {
        if (active.id) {
          focusState = {
            id: active.id,
            start: active.selectionStart,
            end: active.selectionEnd
          };
        } else if (active.classList && active.classList.contains("entity-name-input")) {
          focusState = {
            selector: `.entity-name-input[data-index="${active.getAttribute("data-index")}"]`,
            start: active.selectionStart,
            end: active.selectionEnd
          };
        }
      }
    } catch (_) {}

    const entities = this._config.entities || [];
    const showScale = this._config.show_scale !== false;
    const showCurrent = this._config.show_current === true;
    const gradientMode = (this._config.gradient_mode === "local") ? "local" : "global";
    const barHeight = Math.max(6, Math.min(60, parseInt(this._config.bar_height, 10) || 18));
    const availablePeriods = sortPeriods(this._config.available_periods || ["10d", "20d", "30d", "20w", "12m"]);
    const defaultPeriod = this._config.default_period || availablePeriods[0] || "10d";
    const defaultEntity = this._config.default_entity || (entities[0] ? entities[0].entity : "");

    const commonPresets = sortPeriods(["2d", "7d", "10d", "14d", "15d", "20d", "30d", "1w", "4w", "8w", "10w", "20w", "3m", "6m", "12m", "24m", "1y", "2y", "3y", "5y"]);

    const entitiesHtml = entities.map((item, index) => {
      const isExpanded = this._expandedSet && this._expandedSet.has(index);
      const displayName = item.name || item.entity || `Capteur #${index + 1}`;
      return `
        <div class="entity-card ${isExpanded ? "expanded" : "collapsed"}" data-index="${index}" draggable="true">
          <div class="entity-card-header" data-action="toggle-expand" data-index="${index}">
            <div class="entity-card-title">
              <span class="entity-icon">🌡️</span>
              <span class="entity-title-text" title="${displayName}">${displayName}</span>
            </div>
            <div class="entity-actions" onclick="event.stopPropagation()">
              <button class="btn-icon" data-action="up" data-index="${index}" title="Monter" ${index === 0 ? "disabled" : ""}>▲</button>
              <button class="btn-icon" data-action="down" data-index="${index}" title="Descendre" ${index === entities.length - 1 ? "disabled" : ""}>▼</button>
              <button class="btn-icon btn-delete" data-action="delete" data-index="${index}" title="Supprimer">✕</button>
              <button class="btn-icon btn-chevron" data-action="toggle-expand" data-index="${index}" title="${isExpanded ? "Replier" : "Déplier"}">
                <span class="chevron-arrow ${isExpanded ? "open" : ""}">▼</span>
              </button>
              <span class="drag-handle" title="${localize("drag_handle_title", this._hass)}">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M4,9H20V7H4V9M4,13H20V11H4V13M4,17H20V15H4V17Z" />
                </svg>
              </span>
            </div>
          </div>
          <div class="entity-card-body" style="${isExpanded ? "" : "display: none;"}">
            <div class="form-group">
              <label class="form-label">${localize("ha_entity", this._hass)}</label>
              <div class="picker-slot" data-index="${index}"></div>
            </div>
            <div class="form-group" style="margin-top: 6px;">
              <label class="form-label">${localize("custom_name", this._hass)}</label>
              <input type="text" class="form-input entity-name-input" data-index="${index}" value="${item.name || ""}" placeholder="${localize("custom_name_placeholder", this._hass)}">
            </div>
          </div>
        </div>
      `;
    }).join("");

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          color: var(--primary-text-color, #ffffff);
          font-family: inherit;
        }
        .editor-container {
          display: flex;
          flex-direction: column;
          gap: 10px;
          padding: 2px 0;
        }
        .section-box {
          background: var(--ha-card-background, rgba(255, 255, 255, 0.03));
          border: 1px solid var(--divider-color, rgba(255, 255, 255, 0.12));
          border-radius: 8px;
          padding: 10px 12px;
        }
        .section-title {
          font-size: 13px;
          font-weight: 600;
          color: var(--primary-text-color, #ffffff);
          margin-bottom: 8px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .form-group {
          display: flex;
          flex-direction: column;
          gap: 3px;
          margin-bottom: 8px;
        }
        .form-group:last-child {
          margin-bottom: 0;
        }
        .form-grid-2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
        }
        @media (max-width: 480px) {
          .form-grid-2 {
            grid-template-columns: 1fr;
          }
        }
        .form-label {
          font-size: 11px;
          font-weight: 500;
          color: var(--secondary-text-color, #9e9e9e);
        }
        .form-label-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2px;
        }
        .btn-sort {
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.2);
          color: var(--primary-text-color, #ffffff);
          border-radius: 5px;
          padding: 2px 7px;
          font-size: 11px;
          font-weight: 600;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 4px;
          transition: all 0.2s ease;
        }
        .btn-sort:hover {
          background: var(--primary-color, #03a9f4);
          border-color: var(--primary-color, #03a9f4);
        }
        .form-input, .form-select {
          width: 100%;
          background: rgba(255, 255, 255, 0.06);
          color: var(--primary-text-color, #ffffff);
          border: 1px solid rgba(255, 255, 255, 0.18);
          border-radius: 6px;
          padding: 5px 8px;
          font-size: 13px;
          font-family: inherit;
          box-sizing: border-box;
          outline: none;
          transition: border-color 0.2s ease;
        }
        .form-input:focus, .form-select:focus {
          border-color: var(--primary-color, #03a9f4);
          background: rgba(255, 255, 255, 0.1);
        }
        .form-select option {
          background: #252525;
          color: #ffffff;
        }
        .pills-group {
          display: flex;
          flex-wrap: wrap;
          gap: 5px;
          margin-top: 3px;
        }
        .period-chip {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 3px 8px;
          border-radius: 12px;
          font-size: 11px;
          font-weight: 600;
          background: var(--primary-color, #03a9f4);
          color: #ffffff;
          border: 1px solid var(--primary-color, #03a9f4);
          box-shadow: 0 1px 4px rgba(3, 169, 244, 0.25);
        }
        .chip-remove {
          cursor: pointer;
          font-size: 10px;
          background: rgba(0, 0, 0, 0.25);
          border-radius: 50%;
          width: 14px;
          height: 14px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          line-height: 1;
        }
        .chip-remove:hover {
          background: rgba(0, 0, 0, 0.5);
        }
        .preset-badge {
          padding: 2px 7px;
          border-radius: 10px;
          font-size: 11px;
          font-weight: 500;
          cursor: pointer;
          background: rgba(255, 255, 255, 0.05);
          color: var(--secondary-text-color, #9e9e9e);
          border: 1px dashed rgba(255, 255, 255, 0.2);
          transition: all 0.2s ease;
          user-select: none;
        }
        .preset-badge:hover {
          background: rgba(255, 255, 255, 0.12);
          color: var(--primary-text-color, #ffffff);
          border-color: var(--primary-color, #03a9f4);
        }
        .preset-badge.active {
          background: var(--primary-color, #03a9f4) !important;
          color: #ffffff !important;
          border-color: var(--primary-color, #03a9f4) !important;
          font-weight: 600;
        }
        .add-period-row {
          display: flex;
          gap: 6px;
          margin-top: 4px;
        }
        .btn-add-period {
          background: rgba(3, 169, 244, 0.15);
          border: 1px solid var(--primary-color, #03a9f4);
          color: var(--primary-color, #03a9f4);
          border-radius: 6px;
          padding: 0 10px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          white-space: nowrap;
          height: 28px;
          transition: all 0.2s ease;
        }
        .btn-add-period:hover {
          background: var(--primary-color, #03a9f4);
          color: #ffffff;
        }
        .switch-container {
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          user-select: none;
          font-size: 12px;
          color: var(--primary-text-color);
          margin-top: 2px;
        }
        .switch-container input {
          display: none;
        }
        .switch-slider {
          position: relative;
          width: 34px;
          height: 18px;
          background-color: rgba(255, 255, 255, 0.2);
          border-radius: 18px;
          transition: background-color 0.2s ease;
          flex-shrink: 0;
        }
        .switch-slider:before {
          content: "";
          position: absolute;
          width: 14px;
          height: 14px;
          left: 2px;
          bottom: 2px;
          background-color: white;
          border-radius: 50%;
          transition: transform 0.2s ease;
        }
        .switch-container input:checked + .switch-slider {
          background-color: var(--primary-color, #03a9f4);
        }
        .switch-container input:checked + .switch-slider:before {
          transform: translateX(16px);
        }
        .entities-list {
          display: flex;
          flex-direction: column;
          gap: 3px;
          margin-bottom: 6px;
        }
        .entity-card {
          background: var(--card-background-color, rgba(255, 255, 255, 0.04));
          border: 1px solid var(--divider-color, rgba(255, 255, 255, 0.1));
          border-radius: 5px;
          overflow: hidden;
          transition: all 0.15s ease;
          margin-bottom: 0;
        }
        .entity-card:hover {
          border-color: rgba(255, 255, 255, 0.25);
        }
        .entity-card.expanded {
          border-color: var(--primary-color, #03a9f4);
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.25);
          margin-bottom: 3px;
        }
        .entity-card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: rgba(255, 255, 255, 0.03);
          padding: 3px 8px;
          min-height: 28px;
          cursor: pointer;
          user-select: none;
          transition: background 0.15s ease;
        }
        .entity-card.expanded .entity-card-header {
          border-bottom: 1px solid var(--divider-color, rgba(255, 255, 255, 0.08));
          background: rgba(255, 255, 255, 0.05);
        }
        .entity-card-header:hover {
          background: rgba(255, 255, 255, 0.07);
        }
        .entity-card-title {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          font-weight: 500;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          flex: 1;
          margin-right: 4px;
        }
        .entity-icon {
          font-size: 13px;
          line-height: 1;
          flex-shrink: 0;
        }
        .entity-title-text {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .entity-actions {
          display: flex;
          align-items: center;
          gap: 2px;
          flex-shrink: 0;
        }
        .btn-icon {
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.15);
          color: var(--primary-text-color, #ffffff);
          border-radius: 3px;
          width: 20px;
          height: 20px;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 9px;
          padding: 0;
          transition: all 0.2s ease;
        }
        .btn-icon:hover:not(:disabled) {
          background: rgba(255, 255, 255, 0.15);
          border-color: rgba(255, 255, 255, 0.35);
        }
        .btn-icon:disabled {
          opacity: 0.25;
          cursor: default;
        }
        .btn-delete:hover:not(:disabled) {
          background: rgba(244, 67, 54, 0.2);
          border-color: #f44336;
          color: #f44336;
        }
        .btn-chevron {
          padding: 0 2px;
        }
        .chevron-arrow {
          display: inline-block;
          font-size: 8px;
          transition: transform 0.2s ease;
        }
        .chevron-arrow.open {
          transform: rotate(180deg);
        }
        .drag-handle {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          cursor: grab;
          padding: 1px 3px;
          color: var(--secondary-text-color, #9e9e9e);
          border-radius: 3px;
          transition: all 0.15s ease;
          user-select: none;
        }
        .drag-handle:hover {
          color: var(--primary-text-color, #ffffff);
          background: rgba(255, 255, 255, 0.1);
        }
        .drag-handle:active {
          cursor: grabbing;
        }
        .entity-card.dragging {
          opacity: 0.45;
          border: 1px dashed var(--primary-color, #03a9f4);
        }
        .entity-card.drag-over {
          border-color: var(--primary-color, #03a9f4);
          background: rgba(3, 169, 244, 0.12);
          box-shadow: 0 0 8px rgba(3, 169, 244, 0.3);
        }
        .entity-card-body {
          padding: 6px 8px;
        }
        .btn-add-sensor {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          width: 100%;
          background: rgba(3, 169, 244, 0.08);
          border: 1px dashed var(--primary-color, #03a9f4);
          color: var(--primary-color, #03a9f4);
          border-radius: 6px;
          padding: 7px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          font-family: inherit;
          transition: all 0.2s ease;
          margin-top: 4px;
        }
        .btn-add-sensor:hover {
          background: rgba(3, 169, 244, 0.18);
        }
      </style>

      <div class="editor-container">
        <!-- Configuration Générale -->
        <div class="section-box">
          <div class="section-title">${localize("general_settings", this._hass)}</div>
          
          <div class="form-group">
            <label class="form-label">${localize("card_title_label", this._hass)}</label>
            <input type="text" id="title-input" class="form-input" value="${this._config.title || ""}" placeholder="${localize("card_title_placeholder", this._hass)}">
          </div>

          <div class="form-grid-2">
            <div class="form-group">
              <label class="form-label">${localize("default_sensor", this._hass)}</label>
              <select id="default-entity-select" class="form-select">
                ${entities.length === 0 ? '<option value="">${localize("no_sensor_option", this._hass)}</option>' : ''}
                ${entities.map(e => `
                  <option value="${e.entity}" ${e.entity === defaultEntity ? "selected" : ""}>
                    ${e.name || e.entity}
                  </option>
                `).join("")}
              </select>
            </div>

            <div class="form-group">
              <label class="form-label">${localize("default_period", this._hass)}</label>
              <select id="default-period-select" class="form-select">
                ${availablePeriods.map(p => `
                  <option value="${p}" ${p === defaultPeriod ? "selected" : ""}>
                    ${formatPeriodLabel(p, this._hass)} (${p})
                  </option>
                `).join("")}
              </select>
            </div>
          </div>
        </div>

        <!-- Options d'Affichage & Style des Barres -->
        <div class="section-box">
          <div class="section-title">${localize("bar_style_section", this._hass)}</div>

          <div class="form-group">
            <label class="switch-container">
              <input type="checkbox" id="scale-toggle" ${showScale ? "checked" : ""}>
              <span class="switch-slider"></span>
              <span>${localize("show_scale_label", this._hass)}</span>
            </label>
          </div>

          <div class="form-group" style="margin-top: 6px;">
            <label class="switch-container">
              <input type="checkbox" id="current-temp-toggle" ${showCurrent ? "checked" : ""}>
              <span class="switch-slider"></span>
              <span>${localize("show_current_label", this._hass)}</span>
            </label>
          </div>

          <div class="form-group" style="margin-top: 6px;">
            <label class="form-label">${localize("gradient_style_label", this._hass)}</label>
            <select id="gradient-mode-select" class="form-select">
              <option value="global" ${gradientMode === "global" ? "selected" : ""}>${localize("gradient_global", this._hass)}</option>
              <option value="local" ${gradientMode === "local" ? "selected" : ""}>${localize("gradient_local", this._hass)}</option>
            </select>
          </div>

          <div class="form-group" style="margin-top: 6px;">
            <div class="form-label-row">
              <span class="form-label">Épaisseur des barres : <strong>${barHeight} px</strong></span>
              <div style="display:flex; align-items:center; gap:4px;">
                <input type="number" id="bar-height-input" class="form-input" style="width:60px; height:24px; padding:1px 5px; text-align:center; font-size:12px;" min="6" max="60" step="1" value="${barHeight}">
                <span style="font-size:11px; color:var(--secondary-text-color);">px</span>
              </div>
            </div>
            <div class="pills-group" style="gap:4px;">
              <span class="preset-badge ${barHeight === 10 ? 'active' : ''}" data-action="set-height" data-val="10">10 ${localize("thickness_fine", this._hass)}</span>
              <span class="preset-badge ${barHeight === 14 ? 'active' : ''}" data-action="set-height" data-val="14">14 ${localize("thickness_standard", this._hass)}</span>
              <span class="preset-badge ${barHeight === 18 ? 'active' : ''}" data-action="set-height" data-val="18">18 ${localize("thickness_default", this._hass)}</span>
              <span class="preset-badge ${barHeight === 24 ? 'active' : ''}" data-action="set-height" data-val="24">24 ${localize("thickness_thick", this._hass)}</span>
              <span class="preset-badge ${barHeight === 28 ? 'active' : ''}" data-action="set-height" data-val="28">28 ${localize("thickness_max", this._hass)}</span>
              <span class="preset-badge ${barHeight === 34 ? 'active' : ''}" data-action="set-height" data-val="34">34 ${localize("thickness_xxl", this._hass)}</span>
            </div>
          </div>
        </div>

        <!-- Durées Dynamiques -->
        <div class="section-box">
          <div class="section-title">
            <span>${localize("active_periods_section", this._hass, { count: availablePeriods.length })}</span>
            <button id="btn-sort-periods" class="btn-sort" title="${localize("sort", this._hass)}">${localize("sort", this._hass)}</button>
          </div>

          <div class="pills-group">
            ${availablePeriods.map((p, idx) => `
              <div class="period-chip">
                <span>${formatPeriodLabel(p, this._hass)}</span>
                <span class="chip-remove" data-action="remove-period" data-index="${idx}" title="Retirer">✕</span>
              </div>
            `).join("")}
          </div>

          <div class="form-group" style="margin-top: 8px;">
            <label class="form-label">${localize("quick_suggestions", this._hass)}</label>
            <div class="pills-group">
              ${commonPresets.filter(pr => !availablePeriods.some(ap => parsePeriod(ap).raw === parsePeriod(pr).raw)).map(pr => `
                <span class="preset-badge" data-action="add-preset" data-period="${pr}">+ ${formatPeriodLabel(pr, this._hass)} (${pr})</span>
              `).join("") || '<span style="font-size:11px;color:var(--secondary-text-color);">${localize("all_added", this._hass)}</span>'}
            </div>
          </div>

          <div class="form-group" style="margin-top: 6px;">
            <div class="add-period-row">
              <input type="text" id="custom-period-input" class="form-input" placeholder="${localize("add_custom_placeholder", this._hass)}" style="max-width: 220px; height: 28px;">
              <button id="btn-add-period" class="btn-add-period">${localize("add_button", this._hass)}</button>
            </div>
          </div>
        </div>

        <!-- Liste des Capteurs Thermiques -->
        <div class="section-box">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
            <div class="section-title" style="margin-bottom:0;">${localize("sensors_section", this._hass, { count: entities.length })}</div>
            <div style="display:flex; gap:5px;">
              <button id="btn-expand-all" class="btn-sort" style="font-size:10px; padding:2px 6px;" title="${localize("expand_all", this._hass)}">${localize("expand_all", this._hass)}</button>
              <button id="btn-collapse-all" class="btn-sort" style="font-size:10px; padding:2px 6px;" title="${localize("collapse_all", this._hass)}">${localize("collapse_all", this._hass)}</button>
            </div>
          </div>

          <div class="entities-list">
            ${entitiesHtml || '<div style="color:var(--secondary-text-color); font-size:12px; font-style:italic; padding:6px 0;">${localize("no_sensors_configured", this._hass)}</div>'}
          </div>

          <button id="btn-add-sensor" class="btn-add-sensor">
            <span>${localize("add_sensor", this._hass)}</span>
          </button>
        </div>
      </div>
    `;

    // Attacher les écouteurs de l'en-tête
    const titleInput = this.shadowRoot.getElementById("title-input");
    if (titleInput) {
      titleInput.addEventListener("input", (e) => {
        this._config.title = e.target.value;
      });
      titleInput.addEventListener("change", (e) => {
        this._config.title = e.target.value;
        this._fireConfigChanged();
      });
      titleInput.addEventListener("blur", (e) => {
        if (this._config.title !== e.target.value) {
          this._config.title = e.target.value;
          this._fireConfigChanged();
        }
      });
    }

    const defaultEntitySelect = this.shadowRoot.getElementById("default-entity-select");
    if (defaultEntitySelect) {
      defaultEntitySelect.addEventListener("change", (e) => {
        this._config.default_entity = e.target.value;
        this._fireConfigChanged();
      });
    }

    const defaultPeriodSelect = this.shadowRoot.getElementById("default-period-select");
    if (defaultPeriodSelect) {
      defaultPeriodSelect.addEventListener("change", (e) => {
        this._config.default_period = e.target.value;
        this._fireConfigChanged();
      });
    }

    const scaleToggle = this.shadowRoot.getElementById("scale-toggle");
    if (scaleToggle) {
      scaleToggle.addEventListener("change", (e) => {
        this._config.show_scale = e.target.checked;
        this._fireConfigChanged();
      });
    }

    const currentToggle = this.shadowRoot.getElementById("current-temp-toggle");
    if (currentToggle) {
      currentToggle.addEventListener("change", (e) => {
        this._config.show_current = e.target.checked;
        this._fireConfigChanged();
      });
    }

    const gradSelect = this.shadowRoot.getElementById("gradient-mode-select");
    if (gradSelect) {
      gradSelect.addEventListener("change", (e) => {
        this._config.gradient_mode = e.target.value;
        this._fireConfigChanged();
      });
    }

    const heightInput = this.shadowRoot.getElementById("bar-height-input");
    if (heightInput) {
      heightInput.addEventListener("input", (e) => {
        const val = Math.max(6, Math.min(60, parseInt(e.target.value, 10) || 18));
        this._config.bar_height = val;

        const heightLabel = this.shadowRoot.querySelector(".form-label-row .form-label strong");
        if (heightLabel) {
          heightLabel.textContent = `${val} px`;
        }

        this.shadowRoot.querySelectorAll('[data-action="set-height"]').forEach(badge => {
          badge.classList.toggle("active", parseInt(badge.dataset.val, 10) === val);
        });
      });
      heightInput.addEventListener("change", (e) => {
        const val = Math.max(6, Math.min(60, parseInt(e.target.value, 10) || 18));
        this._config.bar_height = val;
        this._fireConfigChanged();
      });
    }

    this.shadowRoot.querySelectorAll('[data-action="set-height"]').forEach(badge => {
      badge.addEventListener("click", () => {
        const val = parseInt(badge.dataset.val, 10) || 18;
        this._config.bar_height = val;

        const hInput = this.shadowRoot.getElementById("bar-height-input");
        if (hInput) hInput.value = val;

        const heightLabel = this.shadowRoot.querySelector(".form-label-row .form-label strong");
        if (heightLabel) {
          heightLabel.textContent = `${val} px`;
        }

        this.shadowRoot.querySelectorAll('[data-action="set-height"]').forEach(b => {
          b.classList.toggle("active", parseInt(b.dataset.val, 10) === val);
        });

        this._fireConfigChanged();
      });
    });

    // Bouton Trier
    const btnSort = this.shadowRoot.getElementById("btn-sort-periods");
    if (btnSort) {
      btnSort.addEventListener("click", () => {
        this._config.available_periods = sortPeriods(this._config.available_periods || []);
        this._fireConfigChanged();
        this._render();
      });
    }

    // Retirer une durée (chip)
    const removeBtns = this.shadowRoot.querySelectorAll('[data-action="remove-period"]');
    removeBtns.forEach(btn => {
      btn.addEventListener("click", () => {
        const idx = parseInt(btn.getAttribute("data-index"), 10);
        let current = [...(this._config.available_periods || [])];
        if (current.length > 1) {
          current.splice(idx, 1);
          this._config.available_periods = sortPeriods(current);
          this._fireConfigChanged();
          this._render();
        }
      });
    });

    // Ajouter un preset (trié automatiquement)
    const presetBadges = this.shadowRoot.querySelectorAll('[data-action="add-preset"]');
    presetBadges.forEach(badge => {
      badge.addEventListener("click", () => {
        const pVal = badge.getAttribute("data-period");
        let current = [...(this._config.available_periods || [])];
        if (!current.includes(pVal)) {
          current.push(pVal);
          this._config.available_periods = sortPeriods(current);
          this._fireConfigChanged();
          this._render();
        }
      });
    });

    // Ajouter une durée libre personnalisée (triée automatiquement)
    const customInput = this.shadowRoot.getElementById("custom-period-input");
    const btnAddPeriod = this.shadowRoot.getElementById("btn-add-period");
    const handleAddCustom = () => {
      if (!customInput) return;
      const raw = customInput.value.trim().toLowerCase();
      if (!raw) return;
      const parsed = parsePeriod(raw);
      if (parsed) {
        let current = [...(this._config.available_periods || [])];
        if (!current.some(x => parsePeriod(x).raw === parsed.raw)) {
          current.push(parsed.raw);
          this._config.available_periods = sortPeriods(current);
          this._fireConfigChanged();
          this._render();
        }
      }
    };
    if (btnAddPeriod) btnAddPeriod.addEventListener("click", handleAddCustom);
    if (customInput) {
      customInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") handleAddCustom();
      });
    }

    // Insérer les sélecteurs d'entités ha-entity-picker
    const slots = this.shadowRoot.querySelectorAll(".picker-slot");
    slots.forEach(slot => {
      const idx = parseInt(slot.getAttribute("data-index"), 10);
      const item = entities[idx];
      if (!item) return;

      if (customElements.get("ha-entity-picker")) {
        const picker = document.createElement("ha-entity-picker");
        picker.hass = this._hass;
        picker.value = item.entity || "";
        picker.includeDomains = ["sensor"];
        picker.entityFilter = (stateObj) => {
          if (!stateObj) return false;
          const attrs = stateObj.attributes || {};
          const uom = attrs.unit_of_measurement;
          if (uom === "°C" || uom === "°F" || uom === "K") return true;
          if (attrs.device_class === "temperature") return true;
          const id = (stateObj.entity_id || "").toLowerCase();
          return id.includes("temp_") || id.includes("_temp") || id.includes("temperature");
        };
        picker.label = "Entité Home Assistant";
        picker.required = true;
        picker.addEventListener("value-changed", (ev) => {
          ev.stopPropagation();
          const newEntity = ev.detail.value;
          if (newEntity !== undefined && newEntity !== item.entity) {
            item.entity = newEntity;
            if (!item.name && this._hass && this._hass.states[newEntity]) {
              item.name = this._hass.states[newEntity].attributes?.friendly_name || newEntity.replace("sensor.", "");
            }
            this._fireConfigChanged();
            this._render();
          }
        });
        slot.appendChild(picker);
      } else {
        const input = document.createElement("input");
        input.type = "text";
        input.className = "form-input";
        input.value = item.entity || "";
        input.placeholder = "sensor.mon_capteur_temperature";
        input.addEventListener("change", (ev) => {
          item.entity = ev.target.value;
          this._fireConfigChanged();
        });
        slot.appendChild(input);
      }
    });

    // Écouteurs pour le champ de nom personnalisé
    const nameInputs = this.shadowRoot.querySelectorAll(".entity-name-input");
    nameInputs.forEach(input => {
      const idx = parseInt(input.getAttribute("data-index"), 10);
      input.addEventListener("input", (ev) => {
        if (this._config.entities[idx]) {
          this._config.entities[idx].name = ev.target.value;

          // Mise à jour immédiate du titre du bandeau sans détruire le DOM
          const card = input.closest(".entity-card");
          if (card) {
            const titleEl = card.querySelector(".entity-title-text");
            if (titleEl) {
              const displayName = ev.target.value || this._config.entities[idx].entity || `Capteur #${idx + 1}`;
              titleEl.textContent = displayName;
              titleEl.title = displayName;
            }
          }

          // Mise à jour de l'option correspondante dans le sélecteur de capteur par défaut
          const defaultSelect = this.shadowRoot.getElementById("default-entity-select");
          if (defaultSelect && this._config.entities[idx].entity) {
            const opt = defaultSelect.querySelector(`option[value="${this._config.entities[idx].entity}"]`);
            if (opt) {
              opt.textContent = ev.target.value || this._config.entities[idx].entity;
            }
          }
        }
      });
      input.addEventListener("change", (ev) => {
        if (this._config.entities[idx]) {
          this._config.entities[idx].name = ev.target.value;
          this._fireConfigChanged();
        }
      });
      input.addEventListener("blur", (ev) => {
        if (this._config.entities[idx] && this._config.entities[idx].name !== ev.target.value) {
          this._config.entities[idx].name = ev.target.value;
          this._fireConfigChanged();
        }
      });
    });

    // Écouteurs pour déplier / replier un capteur
    const toggleHeaders = this.shadowRoot.querySelectorAll('[data-action="toggle-expand"]');
    toggleHeaders.forEach(el => {
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        const idx = parseInt(el.getAttribute("data-index"), 10);
        if (this._expandedSet.has(idx)) {
          this._expandedSet.delete(idx);
        } else {
          this._expandedSet.add(idx);
        }
        this._render();
      });
    });

    // Tout déplier / Tout replier
    const btnExpandAll = this.shadowRoot.getElementById("btn-expand-all");
    if (btnExpandAll) {
      btnExpandAll.addEventListener("click", () => {
        this._config.entities.forEach((_, i) => this._expandedSet.add(i));
        this._render();
      });
    }
    const btnCollapseAll = this.shadowRoot.getElementById("btn-collapse-all");
    if (btnCollapseAll) {
      btnCollapseAll.addEventListener("click", () => {
        this._expandedSet.clear();
        this._render();
      });
    }

    // Drag & Drop pour réordonner les capteurs
    let dragSrcIndex = null;
    const cards = this.shadowRoot.querySelectorAll(".entity-card");
    cards.forEach(card => {
      card.addEventListener("dragstart", (e) => {
        dragSrcIndex = parseInt(card.getAttribute("data-index"), 10);
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", dragSrcIndex);
        card.classList.add("dragging");
      });

      card.addEventListener("dragover", (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        if (!card.classList.contains("drag-over")) {
          card.classList.add("drag-over");
        }
      });

      card.addEventListener("dragleave", () => {
        card.classList.remove("drag-over");
      });

      card.addEventListener("drop", (e) => {
        e.preventDefault();
        card.classList.remove("drag-over");
        const fromIdx = dragSrcIndex !== null ? dragSrcIndex : parseInt(e.dataTransfer.getData("text/plain"), 10);
        const toIdx = parseInt(card.getAttribute("data-index"), 10);
        if (fromIdx !== null && !isNaN(fromIdx) && fromIdx !== toIdx) {
          const item = this._config.entities.splice(fromIdx, 1)[0];
          this._config.entities.splice(toIdx, 0, item);

          // Mettre à jour l'état déplié des cartes
          const nextSet = new Set();
          this._expandedSet.forEach(idx => {
            if (idx === fromIdx) {
              nextSet.add(toIdx);
            } else if (fromIdx < toIdx && idx > fromIdx && idx <= toIdx) {
              nextSet.add(idx - 1);
            } else if (fromIdx > toIdx && idx >= toIdx && idx < fromIdx) {
              nextSet.add(idx + 1);
            } else {
              nextSet.add(idx);
            }
          });
          this._expandedSet = nextSet;

          this._fireConfigChanged();
          this._render();
        }
      });

      card.addEventListener("dragend", () => {
        dragSrcIndex = null;
        card.classList.remove("dragging");
        this.shadowRoot.querySelectorAll(".entity-card").forEach(c => c.classList.remove("drag-over", "dragging"));
      });
    });

    // Écouteurs pour les boutons d'action (monter, descendre, supprimer)
    const actionBtns = this.shadowRoot.querySelectorAll(".btn-icon");
    actionBtns.forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const action = btn.getAttribute("data-action");
        const idx = parseInt(btn.getAttribute("data-index"), 10);
        if (action === "up" && idx > 0) {
          const tmp = this._config.entities[idx];
          this._config.entities[idx] = this._config.entities[idx - 1];
          this._config.entities[idx - 1] = tmp;
          const curExp = this._expandedSet.has(idx);
          const prevExp = this._expandedSet.has(idx - 1);
          if (curExp) this._expandedSet.add(idx - 1); else this._expandedSet.delete(idx - 1);
          if (prevExp) this._expandedSet.add(idx); else this._expandedSet.delete(idx);
          this._fireConfigChanged();
          this._render();
        } else if (action === "down" && idx < this._config.entities.length - 1) {
          const tmp = this._config.entities[idx];
          this._config.entities[idx] = this._config.entities[idx + 1];
          this._config.entities[idx + 1] = tmp;
          const curExp = this._expandedSet.has(idx);
          const nextExp = this._expandedSet.has(idx + 1);
          if (curExp) this._expandedSet.add(idx + 1); else this._expandedSet.delete(idx + 1);
          if (nextExp) this._expandedSet.add(idx); else this._expandedSet.delete(idx);
          this._fireConfigChanged();
          this._render();
        } else if (action === "delete") {
          this._config.entities.splice(idx, 1);
          const nextSet = new Set();
          this._expandedSet.forEach(i => {
            if (i < idx) nextSet.add(i);
            else if (i > idx) nextSet.add(i - 1);
          });
          this._expandedSet = nextSet;
          this._fireConfigChanged();
          this._render();
        }
      });
    });

    // Bouton ajouter un capteur (ouvert automatiquement en mode déplié)
    const btnAdd = this.shadowRoot.getElementById("btn-add-sensor");
    if (btnAdd) {
      btnAdd.addEventListener("click", () => {
        if (!Array.isArray(this._config.entities)) {
          this._config.entities = [];
        }
        const newIndex = this._config.entities.length;
        this._config.entities.push({ entity: "", name: "" });
        this._expandedSet.add(newIndex);
        this._fireConfigChanged();
        this._render();
      });
    }

    this._isRendered = true;

    // Restaurer le focus si nécessaire
    if (focusState) {
      try {
        const target = focusState.id
          ? this.shadowRoot.getElementById(focusState.id)
          : (focusState.selector ? this.shadowRoot.querySelector(focusState.selector) : null);
        if (target) {
          target.focus();
          if (typeof focusState.start === "number" && typeof focusState.end === "number") {
            target.setSelectionRange(focusState.start, focusState.end);
          }
        }
      } catch (_) {}
    }
  }
}

if (!customElements.get("temperature-range-card-editor")) {
  customElements.define("temperature-range-card-editor", TemperatureRangeCardEditor);
}

// =============================================================================
// CARTE PRINCIPALE (TemperatureRangeCard)
// =============================================================================

class TemperatureRangeCard extends HTMLElement {
  static async getConfigElement() {
    return document.createElement("temperature-range-card-editor");
  }

  static getStubConfig(hass, entities) {
    return {
      type: "custom:temperature-range-card",
      title: "Comparatif & Amplitudes Thermiques",
      default_period: "10d",
      show_scale: true,
      show_current: false,
      gradient_mode: "global",
      bar_height: 18,
      available_periods: ["10d", "20d", "30d", "20w", "12m"],
      entities: []
    };
  }

  setConfig(config) {
    this.config = Object.assign({
      title: "Amplitudes & Comparatif Journalier",
      show_scale: true,
      show_current: false,
      default_period: "10d",
      gradient_mode: "global",
      bar_height: 18,
      available_periods: ["10d", "20d", "30d", "20w", "12m"]
    }, config);

    // Initialiser les entités sélectionnables
    if (this.config.entities && Array.isArray(this.config.entities)) {
      this._entitiesList = this.config.entities.map(e => {
        if (typeof e === "string") return { entity: e, name: e.replace("sensor.", "") };
        return e;
      }).filter(e => e && e.entity);
    } else if (this.config.entity) {
      this._entitiesList = [{ entity: this.config.entity, name: this.config.name || "Sélection" }];
    } else {
      this._entitiesList = [];
    }

    const savedEntity = localStorage.getItem("temp_range_selected_entity");
    const validSavedEntity = this._entitiesList.some(e => e.entity === savedEntity) ? savedEntity : null;
    this._selectedEntity = validSavedEntity || this.config.default_entity || (this._entitiesList[0] ? this._entitiesList[0].entity : "");

    const rawAllowed = (Array.isArray(this.config.available_periods) && this.config.available_periods.length)
      ? this.config.available_periods
      : ["10d", "20d", "30d", "20w", "12m"];
    const sortedAllowed = sortPeriods(rawAllowed);

    const savedPeriod = localStorage.getItem("temp_range_selected_period");
    let chosenPeriod = savedPeriod || this.config.default_period || sortedAllowed[0];
    const isChosenValid = sortedAllowed.some(p => parsePeriod(p).raw === parsePeriod(chosenPeriod).raw);
    if (!isChosenValid) {
      chosenPeriod = sortedAllowed[0] || "10d";
    }
    this._selectedPeriod = chosenPeriod;

    this._history = null;
    this._stats = null;
    this._loading = false;
    this._lastState = null;

    if (!this.shadowRoot) {
      this.attachShadow({ mode: "open" });
    }

    if (this._hass) {
      this._render();
      this._fetchData();
    }
  }

  set hass(hass) {
    this._hass = hass;
    const cur = hass.states[this._selectedEntity];
    if (!cur) return;

    if (!this._history && !this._stats && !this._loading) {
      this._fetchData();
    } else if (this._lastState !== cur.state) {
      this._lastState = cur.state;
      this._render();
    }
  }

  async _fetchData() {
    if (!this._selectedEntity) {
      this._loading = false;
      return;
    }
    this._loading = true;
    try {
      const mode = this._selectedPeriod;
      const { count, unit } = parsePeriod(mode);
      const now = Date.now();
      const statsIds = [this._selectedEntity];

      if (unit === "d") {
        const dStatsStart = new Date(now);
        dStatsStart.setDate(dStatsStart.getDate() - (count + 1));
        dStatsStart.setHours(0, 0, 0, 0);
        const statsStart = dStatsStart.toISOString();

        // Récupérer l'historique brut jusqu'à 31 jours (le recorder fournira ce qu'il conserve réellement)
        const histDays = Math.min(count, 31);
        const dHistStart = new Date(now);
        dHistStart.setDate(dHistStart.getDate() - (histDays + 1));
        dHistStart.setHours(0, 0, 0, 0);
        const histStart = dHistStart.toISOString();

        // 1. Fetch detailed history for same-time points
        const histPromise = this._hass.callWS({
          type: "history/history_during_period",
          start_time: histStart,
          entity_ids: [this._selectedEntity],
          minimal_response: true,
          no_attributes: true
        });

        // 2. Fetch daily statistics for exact min/max over N days
        const statsPromise = this._hass.callWS({
          type: "recorder/statistics_during_period",
          start_time: statsStart,
          statistic_ids: statsIds,
          period: "day"
        });

        const [histRes, statsRes] = await Promise.all([histPromise, statsPromise]);
        this._history = histRes[this._selectedEntity] || [];
        this._stats = statsRes[this._selectedEntity] || [];

      } else if (unit === "w") {
        // Fetch count + 2 weeks of statistics to reliably display count full weeks
        const statsStart = new Date(now - ((count + 2) * 7 * 24 * 3600 * 1000)).toISOString();
        const statsRes = await this._hass.callWS({
          type: "recorder/statistics_during_period",
          start_time: statsStart,
          statistic_ids: statsIds,
          period: "week"
        });
        this._history = [];
        this._stats = statsRes[this._selectedEntity] || [];

      } else if (unit === "m") {
        // Fetch daily statistics for count * 32 days to display count full months
        const statsStart = new Date(now - ((count * 32 + 10) * 24 * 3600 * 1000)).toISOString();
        const statsRes = await this._hass.callWS({
          type: "recorder/statistics_during_period",
          start_time: statsStart,
          statistic_ids: statsIds,
          period: "day"
        });
        this._history = [];
        this._stats = statsRes[this._selectedEntity] || [];

      } else if (unit === "y") {
        // Fetch monthly statistics for count * 366 + 35 days to aggregate annual min/max
        const statsStart = new Date(now - ((count * 366 + 35) * 24 * 3600 * 1000)).toISOString();
        const statsRes = await this._hass.callWS({
          type: "recorder/statistics_during_period",
          start_time: statsStart,
          statistic_ids: statsIds,
          period: "month"
        });
        this._history = [];
        this._stats = statsRes[this._selectedEntity] || [];
      }

      this._loading = false;
      this._render();
    } catch (e) {
      console.error("Erreur temperature-range-card fetch:", e);
      this._loading = false;
      this._render();
    }
  }

  _onSelectChange(e) {
    this._selectedEntity = e.target.value;
    try {
      localStorage.setItem("temp_range_selected_entity", this._selectedEntity);
    } catch (_) {}
    this._history = null;
    this._stats = null;
    this._render();
    this._fetchData();
  }

  _onPeriodChange(e) {
    this._selectedPeriod = e.target.value;
    try {
      localStorage.setItem("temp_range_selected_period", this._selectedPeriod);
    } catch (_) {}
    this._history = null;
    this._stats = null;
    this._render();
    this._fetchData();
  }

  _render() {
    if (!this.shadowRoot || !this._hass) return;
    const userLocale = getUserLocale(this._hass);

    if (!this._entitiesList || this._entitiesList.length === 0 || !this._selectedEntity) {
      this.shadowRoot.innerHTML = `
        <style>
          :host {
            display: block;
          }
          ha-card {
            background: var(--ha-card-background, var(--card-background-color, #1c1c1e));
            border-radius: var(--ha-card-border-radius, 16px);
            box-shadow: var(--ha-card-box-shadow, 0 4px 20px rgba(0, 0, 0, 0.15));
            padding: 32px 20px;
            color: var(--primary-text-color, #ffffff);
            text-align: center;
          }
          .empty-icon {
            font-size: 38px;
            margin-bottom: 12px;
          }
          .empty-title {
            font-size: 16px;
            font-weight: 600;
            margin-bottom: 6px;
          }
          .empty-desc {
            font-size: 13px;
            color: var(--secondary-text-color, #9e9e9e);
            line-height: 1.5;
          }
        </style>
        <ha-card>
          <div class="empty-icon">🌡️</div>
          <div class="empty-title">${this.config.title || "Comparatif & Amplitudes Thermiques"}</div>
          <div class="empty-desc">
            ${localize("no_sensors_title", this._hass)}<br>${localize("no_sensors_desc", this._hass)}
          </div>
        </ha-card>
      `;
      return;
    }

    const cur = this._hass.states[this._selectedEntity];
    const unitMeasure = cur ? (cur.attributes.unit_of_measurement || "°C") : "°C";
    let currentTempValue = null;
    if (cur && cur.state !== undefined && cur.state !== null && !isNaN(parseFloat(cur.state))) {
      currentTempValue = parseFloat(cur.state).toFixed(1);
    }

    const rawAllowed = (Array.isArray(this.config.available_periods) && this.config.available_periods.length)
      ? this.config.available_periods
      : ["10d", "20d", "30d", "20w", "12m"];

    // Tri logique garanti : Jours croissants, Semaines croissantes, Mois croissants
    const sortedAllowed = sortPeriods(rawAllowed);

    const allowedPeriods = sortedAllowed.map(p => ({
      id: p,
      label: formatPeriodLabel(p, this._hass),
      normalized: parsePeriod(p).raw
    }));

    let currentMode = this._selectedPeriod || this.config.default_period || allowedPeriods[0].id;
    const currentParsed = parsePeriod(currentMode);
    if (!allowedPeriods.some(p => p.normalized === currentParsed.raw)) {
      currentMode = allowedPeriods[0].id;
      this._selectedPeriod = currentMode;
    }

    const { count, unit } = parsePeriod(currentMode);
    const now = new Date();
    const nowTimeStr = now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

    let rowsList = [];
    let subtitleHtml = "";

    if (unit === "d") {
      const daysCount = count;

      // 1. Calculer les min/max exacts depuis l'historique direct (_history) pour les jours récents
      const histDaysMap = new Map();
      let earliestHistTs = Infinity;
      if (this._history && this._history.length) {
        earliestHistTs = this._history[0].lu;
        for (const pt of this._history) {
          const val = parseFloat(pt.s);
          if (isNaN(val)) continue;
          const ptDate = new Date(pt.lu * 1000);
          const dStr = ptDate.toLocaleDateString(userLocale, { year: "numeric", month: "2-digit", day: "2-digit" });
          if (!histDaysMap.has(dStr)) {
            histDaysMap.set(dStr, { min: val, max: val });
          } else {
            const h = histDaysMap.get(dStr);
            if (val < h.min) h.min = val;
            if (val > h.max) h.max = val;
          }
        }
      }

      // Nombre de jours réels disposant d'un point historique à la même heure
      let pointsAvailableCount = 0;

      // 2. Initialiser les N jours (utilisation de setDate pour respecter strictement les jours calendaires et transitions DST/heure d'été-hiver)
      for (let i = 0; i < daysCount; i++) {
        const targetDate = new Date(now);
        targetDate.setDate(now.getDate() - i);
        const dateStr = targetDate.toLocaleDateString(userLocale, { year: "numeric", month: "2-digit", day: "2-digit" });
        const targetTs = Math.floor(targetDate.getTime() / 1000);
        
        let label = "";
        if (i === 0) label = localize("today", this._hass);
        else if (i === 1) label = localize("yesterday", this._hass);
        else {
          const w = targetDate.toLocaleDateString(userLocale, { weekday: "short" });
          const d = targetDate.toLocaleDateString(userLocale, { day: "2-digit", month: "2-digit" });
          label = `${w.charAt(0).toUpperCase() + w.slice(1)} ${d}`;
        }

        const isToday = i === 0;
        const currentVal = (isToday && cur && !isNaN(parseFloat(cur.state))) ? parseFloat(cur.state) : null;

        // Détection dynamique réelle : le point n'est cherché que si targetTs est dans la plage de l'historique brut conservé
        let sameTimeVal = isToday ? currentVal : null;
        if (!isToday && this._history && this._history.length && targetTs >= earliestHistTs) {
          for (const pt of this._history) {
            if (pt.lu <= targetTs) {
              const v = parseFloat(pt.s);
              if (!isNaN(v)) sameTimeVal = v;
            } else {
              break;
            }
          }
        }

        if (sameTimeVal !== null) {
          pointsAvailableCount++;
        }

        let dayMin = null;
        let dayMax = null;
        let hasDirectHist = false;

        if (histDaysMap.has(dateStr)) {
          const h = histDaysMap.get(dateStr);
          dayMin = h.min;
          dayMax = h.max;
          hasDirectHist = true;
        }

        if (isToday && currentVal !== null) {
          dayMin = dayMin === null ? currentVal : Math.min(dayMin, currentVal);
          dayMax = dayMax === null ? currentVal : Math.max(dayMax, currentVal);
        }

        rowsList.push({
          dateStr: dateStr,
          label: label,
          min: dayMin,
          max: dayMax,
          sameTimeVal: sameTimeVal,
          isToday: isToday,
          hasDirectHist: hasDirectHist
        });
      }

      // Sous-titre dynamique selon la présence réelle des points
      if (daysCount <= 10 || pointsAvailableCount >= daysCount) {
        subtitleHtml = `
          <span class="legend-item"><span class="legend-dot today"></span> T° actuelle (${nowTimeStr})</span>
          <span class="legend-item"><span class="legend-dot past"></span> Même heure (${nowTimeStr}) les jours passés</span>
        `;
      } else {
        subtitleHtml = `
          <span class="legend-item"><span class="legend-dot today"></span> T° actuelle (${nowTimeStr})</span>
          <span class="legend-item"><span class="legend-dot past"></span> Même heure (sur les ${pointsAvailableCount} jours récents)</span>
          <span class="legend-item" style="opacity:0.8;">Barres Min-Max sur ${daysCount} jours</span>
        `;
      }

      // 3. Compléter avec les statistiques pour les jours antérieurs
      if (this._stats && this._stats.length) {
        for (const stat of this._stats) {
          const statDate = new Date(stat.start);
          const statDateStr = statDate.toLocaleDateString(userLocale, { year: "numeric", month: "2-digit", day: "2-digit" });
          const row = rowsList.find(r => r.dateStr === statDateStr);
          if (row && !row.hasDirectHist) {
            if (stat.min !== null && stat.min !== undefined) {
              row.min = row.min === null ? stat.min : Math.min(row.min, stat.min);
            }
            if (stat.max !== null && stat.max !== undefined) {
              row.max = row.max === null ? stat.max : Math.max(row.max, stat.max);
            }
          }
        }
      }

    } else if (unit === "w") {
      subtitleHtml = `<span>Synthèse hebdomadaire des ${count} dernières semaines (Numéros de semaine ISO)</span>`;
      if (this._stats && this._stats.length) {
        const sorted = [...this._stats].reverse().slice(0, count);
        rowsList = sorted.map((stat, idx) => {
          const sDate = new Date(stat.start);
          const wNum = getISOWeekNumber(sDate);
          const label = idx === 0 ? `Sem. ${wNum} (Auj.)` : `Semaine ${wNum}`;
          return {
            label: label,
            min: stat.min,
            max: stat.max,
            sameTimeVal: idx === 0 ? (currentTempValue !== null ? parseFloat(currentTempValue) : null) : null,
            isToday: idx === 0
          };
        });
      }

    } else if (unit === "m") {
      subtitleHtml = `<span>Synthèse mensuelle des ${count} derniers mois (Évolution des saisons & amplitudes)</span>`;
      if (this._stats && this._stats.length) {
        const monthsMap = {};
        for (const stat of this._stats) {
          const dt = new Date(stat.start);
          const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`;
          let mName = dt.toLocaleDateString(userLocale, { month: "short", year: "2-digit" });
          mName = mName.charAt(0).toUpperCase() + mName.slice(1);
          if (!monthsMap[key]) {
            monthsMap[key] = { label: mName, min: stat.min, max: stat.max };
          } else {
            if (stat.min !== null && (monthsMap[key].min === null || stat.min < monthsMap[key].min)) {
              monthsMap[key].min = stat.min;
            }
            if (stat.max !== null && (monthsMap[key].max === null || stat.max > monthsMap[key].max)) {
              monthsMap[key].max = stat.max;
            }
          }
        }
        const sortedKeys = Object.keys(monthsMap).sort().reverse().slice(0, count);
        const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
        rowsList = sortedKeys.map((k, idx) => ({
          label: monthsMap[k].label,
          min: monthsMap[k].min,
          max: monthsMap[k].max,
          sameTimeVal: k === currentMonthKey ? (currentTempValue !== null ? parseFloat(currentTempValue) : null) : null,
          isToday: k === currentMonthKey
        }));
      }

    } else if (unit === "y") {
      subtitleHtml = count === 1
        ? `<span>${localize("subtitle_year_single", this._hass)}</span>`
        : `<span>${localize("subtitle_years", this._hass, { count })}</span>`;
      if (this._stats && this._stats.length) {
        const yearsMap = {};
        for (const stat of this._stats) {
          const dt = new Date(stat.start);
          const yKey = String(dt.getFullYear());
          if (!yearsMap[yKey]) {
            yearsMap[yKey] = { label: yKey, min: stat.min, max: stat.max };
          } else {
            if (stat.min !== null && (yearsMap[yKey].min === null || stat.min < yearsMap[yKey].min)) {
              yearsMap[yKey].min = stat.min;
            }
            if (stat.max !== null && (yearsMap[yKey].max === null || stat.max > yearsMap[yKey].max)) {
              yearsMap[yKey].max = stat.max;
            }
          }
        }
        const sortedKeys = Object.keys(yearsMap).sort().reverse().slice(0, count);
        const currentYearStr = String(new Date().getFullYear());
        rowsList = sortedKeys.map((k, idx) => ({
          label: k === currentYearStr ? `${k} (${localize("in_progress", this._hass)})` : k,
          min: yearsMap[k].min,
          max: yearsMap[k].max,
          sameTimeVal: k === currentYearStr ? (currentTempValue !== null ? parseFloat(currentTempValue) : null) : null,
          isToday: k === currentYearStr
        }));
      }
    }

    // Calculer les bornes globales Min et Max pour la barre grise
    let globalMin = Infinity;
    let globalMax = -Infinity;
    rowsList.forEach(d => {
      if (d.min !== null && d.min < globalMin) globalMin = d.min;
      if (d.max !== null && d.max > globalMax) globalMax = d.max;
    });

    if (globalMin === Infinity || globalMax === -Infinity || globalMin === globalMax) {
      globalMin = 18;
      globalMax = 24;
    } else {
      globalMin = Math.floor(globalMin - 0.5);
      globalMax = Math.ceil(globalMax + 0.5);
    }
    const globalSpan = globalMax - globalMin || 1;

    const barHeight = Math.max(6, Math.min(60, parseInt(this.config.bar_height, 10) || 18));
    const gradientMode = (this.config.gradient_mode === "local") ? "local" : "global";

    // Typographie et espacements adaptatifs selon l'épaisseur des barres
    const fontSize = Math.max(10, Math.min(18, Math.round(10.5 + (barHeight - 6) * 0.28)));
    const tempFontSize = Math.max(9, Math.min(17, Math.round(10 + (barHeight - 6) * 0.26)));
    const rowGap = Math.max(4, Math.min(20, Math.round(4 + (barHeight - 6) * 0.45)));
    const tempMargin = Math.max(6, Math.min(14, Math.round(7 + (barHeight - 6) * 0.2)));
    const dayWidth = Math.max(72, Math.min(115, Math.round(74 + (fontSize - 10) * 4.5)));
    const tempWidth = Math.max(34, Math.min(52, Math.round(36 + (tempFontSize - 9) * 2)));
    const spacerLeft = dayWidth + tempWidth + tempMargin;
    const spacerRight = tempWidth + tempMargin;
    const headerFontSize = Math.max(9, Math.min(12, Math.round(fontSize * 0.75)));

    const dotTodaySize = Math.max(9, Math.round(barHeight * 0.62));
    const dotPastSize = Math.max(6, Math.round(barHeight * 0.44));

    // Construction de l'Échelle des températures (Min, Intermédiaires, Max)
    const showScale = this.config.show_scale !== false;
    let scaleHtml = "";
    let trackGuidesHtml = "";

    if (showScale && rowsList.length > 0) {
      let ticks = [];
      if (globalSpan >= 8) {
        const p25 = Math.round(globalMin + 0.25 * globalSpan);
        const p50 = Math.round(globalMin + 0.50 * globalSpan);
        const p75 = Math.round(globalMin + 0.75 * globalSpan);

        const pct25 = Math.max(8, Math.min(92, ((p25 - globalMin) / globalSpan) * 100));
        const pct50 = Math.max(pct25 + 8, Math.min(92, ((p50 - globalMin) / globalSpan) * 100));
        const pct75 = Math.max(pct50 + 8, Math.min(92, ((p75 - globalMin) / globalSpan) * 100));

        ticks = [
          { val: p25, pct: pct25 },
          { val: p50, pct: pct50 },
          { val: p75, pct: pct75 }
        ];
      } else if (globalSpan >= 4) {
        const p33 = Math.round(globalMin + 0.333 * globalSpan);
        const p66 = Math.round(globalMin + 0.667 * globalSpan);
        const pct33 = Math.max(10, Math.min(90, ((p33 - globalMin) / globalSpan) * 100));
        const pct66 = Math.max(pct33 + 10, Math.min(90, ((p66 - globalMin) / globalSpan) * 100));
        ticks = [
          { val: p33, pct: pct33 },
          { val: p66, pct: pct66 }
        ];
      } else {
        const p50 = Math.round((globalMin + 0.50 * globalSpan) * 10) / 10;
        ticks = [
          { val: p50, pct: 50 }
        ];
      }

      trackGuidesHtml = ticks.map(t => `<div class="bar-track-guide" style="left:${t.pct}%;"></div>`).join("");

      const midTicksHtml = ticks.map(t => `
        <div class="scale-point mid" style="left: ${t.pct}%;">
          <span class="scale-label">${t.val}°</span>
          <span class="scale-tick"></span>
        </div>
      `).join("");

      scaleHtml = `
        <div class="scale-row">
          <div class="scale-spacer-left">
            <span class="scale-legend-tag">${localize("scale", this._hass)}</span>
            <span class="scale-header-min">Min</span>
          </div>
          <div class="scale-track">
            <div class="scale-point min" style="left: 0%;">
              <span class="scale-label">${globalMin}°</span>
              <span class="scale-tick"></span>
            </div>
            ${midTicksHtml}
            <div class="scale-point max" style="left: 100%;">
              <span class="scale-label">${globalMax}°</span>
              <span class="scale-tick"></span>
            </div>
          </div>
          <div class="scale-spacer-right">
            <span class="scale-header-max">Max</span>
          </div>
        </div>
      `;
    } else if (rowsList.length > 0) {
      scaleHtml = `
        <div class="scale-row no-track">
          <div class="scale-spacer-left">
            <span></span>
            <span class="scale-header-min">Min</span>
          </div>
          <div class="scale-track" style="height:0; opacity:0; pointer-events:none;"></div>
          <div class="scale-spacer-right">
            <span class="scale-header-max">Max</span>
          </div>
        </div>
      `;
    }

    // Construction HTML des lignes
    const rowsHtml = rowsList.map(d => {
      const minVal = d.min !== null ? d.min.toFixed(1) : "--";
      const maxVal = d.max !== null ? d.max.toFixed(1) : "--";

      let leftPct = 0;
      let widthPct = 0;
      if (d.min !== null && d.max !== null) {
        leftPct = Math.max(0, Math.min(100, ((d.min - globalMin) / globalSpan) * 100));
        const rightPct = Math.max(0, Math.min(100, ((d.max - globalMin) / globalSpan) * 100));
        widthPct = Math.max(6, rightPct - leftPct);
        if (leftPct + widthPct > 100) {
          leftPct = Math.max(0, 100 - widthPct);
        }
      }

      let dotHtml = "";
      if (d.sameTimeVal !== null) {
        const dotPct = Math.max(0, Math.min(100, ((d.sameTimeVal - globalMin) / globalSpan) * 100));
        const dotClass = d.isToday ? "current-dot today" : "current-dot past";
        const dotTitle = d.isToday
          ? `${localize("current_temp", this._hass)} : ${d.sameTimeVal.toFixed(1)}${unitMeasure}`
          : `${localize("same_time", this._hass)} (${nowTimeStr}) : ${d.sameTimeVal.toFixed(1)}${unitMeasure}`;
        dotHtml = `<div class="${dotClass}" style="left:${dotPct}%;" title="${dotTitle}"></div>`;
      }

      const todayClass = d.isToday ? "today" : "";

      const gradientColors = "linear-gradient(90deg, #43a047 0%, #81c784 25%, #fdd835 55%, #fb8c00 80%, #e53935 100%)";
      let fillGradientStyle = "";
      if (gradientMode === "global") {
        const bgSize = widthPct > 0 ? (10000 / widthPct) : 100;
        const bgPos = (100 - widthPct) > 0.001 ? (leftPct / (100 - widthPct)) * 100 : 0;
        fillGradientStyle = `background: ${gradientColors}; background-size: ${bgSize.toFixed(2)}% 100%; background-position: ${bgPos.toFixed(2)}% 0%;`;
      } else {
        fillGradientStyle = `background: ${gradientColors}; background-size: 100% 100%; background-position: 0% 0%;`;
      }

      return `
        <div class="row">
          <div class="day-label ${todayClass}">${d.label}</div>
          <div class="temp temp-min">${minVal}°</div>
          <div class="bar-track" style="height:${barHeight}px;">
            ${trackGuidesHtml}
            <div class="bar-fill" style="left:${leftPct}%; width:${widthPct}%; min-width:${Math.max(12, barHeight)}px; ${fillGradientStyle}"></div>
            ${dotHtml}
          </div>
          <div class="temp temp-max">${maxVal}°</div>
        </div>
      `;
    }).join("");

    // Menus déroulants en-tête
    const selectorHtml = `
      <div class="selectors-container">
        <div class="select-wrapper">
          <select id="roomSelect" class="entity-select" title="Choisir la zone">
            ${this._entitiesList.map(e => `
              <option value="${e.entity}" ${e.entity === this._selectedEntity ? "selected" : ""}>
                ${e.name}
              </option>
            `).join("")}
          </select>
        </div>
        <div class="select-wrapper">
          <select id="periodSelect" class="entity-select period-select" title="Période & Regroupement">
            ${allowedPeriods.map(p => `
              <option value="${p.id}" ${p.normalized === currentParsed.raw ? "selected" : ""}>
                ${p.label}
              </option>
            `).join("")}
          </select>
        </div>
      </div>
    `;

    const showCurrent = this.config.show_current === true;
    let headerHtml = "";
    if (showCurrent) {
      headerHtml = `
        <div class="header-container-two-rows">
          <div class="header-top-row">
            <div class="card-header">${this.config.title || "Amplitudes Journalières"}</div>
            <div class="current-temp-badge" title="${localize("current_temp", this._hass)}">
              <span class="current-temp-num">${currentTempValue !== null ? currentTempValue : "--"}</span><span class="current-temp-unit">${unitMeasure}</span>
            </div>
          </div>
          <div class="header-selectors-row">
            ${selectorHtml}
          </div>
        </div>
      `;
    } else {
      headerHtml = `
        <div class="header-row">
          <div class="card-header">${this.config.title || "Amplitudes Journalières"}</div>
          ${selectorHtml}
        </div>
      `;
    }

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          width: 100%;
        }
        ha-card {
          padding: 16px 20px 20px 20px;
          box-sizing: border-box;
          background: var(--ha-card-background, var(--card-background-color, #1c1c1e));
          border-radius: var(--ha-card-border-radius, 12px);
          border: var(--ha-card-border-width, 1px) solid var(--ha-card-border-color, var(--divider-color, rgba(255, 255, 255, 0.12)));
          width: 100%;
        }
        .header-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          margin-bottom: 12px;
          flex-wrap: wrap;
        }
        .header-container-two-rows {
          display: flex;
          flex-direction: column;
          gap: 10px;
          margin-bottom: 12px;
        }
        .header-top-row {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          gap: 12px;
        }
        .current-temp-badge {
          display: flex;
          align-items: baseline;
          font-size: 26px;
          font-weight: 700;
          color: var(--primary-text-color, #ffffff);
          letter-spacing: -0.5px;
          line-height: 1;
        }
        .current-temp-num {
          font-variant-numeric: tabular-nums;
        }
        .current-temp-unit {
          font-size: 15px;
          font-weight: 500;
          color: var(--secondary-text-color, #9e9e9e);
          margin-left: 2px;
        }
        .header-selectors-row {
          display: flex;
          align-items: center;
          justify-content: flex-start;
          width: 100%;
        }
        .card-header {
          font-size: 20px !important;
          font-weight: 500 !important;
          color: var(--secondary-text-color) !important;
          padding: 0 !important;
          margin: 0 !important;
          line-height: 1.2;
        }
        .selectors-container {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }
        .select-wrapper {
          position: relative;
          display: inline-block;
        }
        .entity-select {
          appearance: none;
          -webkit-appearance: none;
          background: rgba(255, 255, 255, 0.08);
          color: var(--primary-text-color, #ffffff);
          border: 1px solid rgba(255, 255, 255, 0.18);
          border-radius: 8px;
          padding: 6px 28px 6px 10px;
          font-size: 13px;
          font-weight: 500;
          font-family: inherit;
          cursor: pointer;
          outline: none;
          transition: all 0.2s ease;
        }
        .period-select {
          font-weight: 600;
        }
        .select-wrapper::after {
          content: "▼";
          font-size: 8px;
          color: var(--secondary-text-color, #9e9e9e);
          position: absolute;
          right: 10px;
          top: 50%;
          transform: translateY(-50%);
          pointer-events: none;
        }
        .entity-select:hover, .entity-select:focus {
          border-color: var(--accent-color, #ff9800);
          background: rgba(255, 255, 255, 0.14);
        }
        .entity-select option {
          background: #252525;
          color: #ffffff;
        }
        .subtitle {
          font-size: 12px;
          color: var(--secondary-text-color);
          opacity: 0.75;
          margin-bottom: 14px;
          display: flex;
          align-items: center;
          gap: 14px;
          flex-wrap: wrap;
        }
        .legend-item {
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }
        .legend-dot {
          display: inline-block;
          border-radius: 50%;
        }
        .legend-dot.today {
          width: 9px;
          height: 9px;
          background: #ffffff;
          border: 1.5px solid #1a1a1a;
        }
        .legend-dot.past {
          width: 8px;
          height: 8px;
          background: #cfd8dc;
          border: 1.5px solid #263238;
        }
        .scale-row {
          display: flex;
          align-items: flex-end;
          margin-bottom: 6px;
          user-select: none;
        }
        .scale-spacer-left {
          width: var(--trc-spacer-left, 148px);
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: space-between;
          box-sizing: border-box;
        }
        .scale-legend-tag {
          font-size: 9px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: var(--secondary-text-color);
          opacity: 0.65;
        }
        .scale-header-min {
          width: var(--trc-temp-width, 44px);
          margin-right: var(--trc-temp-margin, 10px);
          text-align: right;
          font-size: var(--trc-header-font-size, 10px);
          font-weight: 600;
          color: var(--secondary-text-color, #9e9e9e);
          text-transform: uppercase;
          letter-spacing: 0.5px;
          opacity: 0.75;
        }
        .scale-spacer-right {
          width: var(--trc-spacer-right, 56px);
          flex-shrink: 0;
          display: flex;
          align-items: center;
          box-sizing: border-box;
        }
        .scale-header-max {
          width: var(--trc-temp-width, 44px);
          margin-left: var(--trc-temp-margin, 10px);
          text-align: left;
          font-size: var(--trc-header-font-size, 10px);
          font-weight: 600;
          color: var(--secondary-text-color, #9e9e9e);
          text-transform: uppercase;
          letter-spacing: 0.5px;
          opacity: 0.75;
        }
        .scale-track {
          flex: 1;
          position: relative;
          height: 18px;
        }
        .scale-point {
          position: absolute;
          bottom: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .scale-point.min {
          left: 0;
          transform: translateX(0);
          align-items: flex-start;
        }
        .scale-point.max {
          left: 100%;
          transform: translateX(-100%);
          align-items: flex-end;
        }
        .scale-point.mid {
          transform: translateX(-50%);
        }
        .scale-label {
          font-size: 11px;
          font-weight: 600;
          color: var(--secondary-text-color, #9e9e9e);
          font-variant-numeric: tabular-nums;
          line-height: 1;
          margin-bottom: 3px;
        }
        .scale-point.min .scale-label {
          color: #81c784;
        }
        .scale-point.max .scale-label {
          color: #ff8a65;
        }
        .scale-tick {
          width: 1px;
          height: 4px;
          background: rgba(255, 255, 255, 0.35);
        }
        .rows-container {
          display: flex;
          flex-direction: column;
          gap: var(--trc-row-gap, 12px);
        }
        .row {
          display: flex;
          align-items: center;
          font-size: var(--trc-font-size, 14px);
          line-height: 1;
        }
        .day-label {
          width: var(--trc-day-width, 92px);
          flex-shrink: 0;
          font-weight: 500;
          font-size: var(--trc-font-size, 14px);
          color: var(--primary-text-color);
          white-space: nowrap;
          font-variant-numeric: tabular-nums;
        }
        .day-label.today {
          color: var(--accent-color, #ff9800);
          font-weight: 700;
        }
        .temp {
          width: var(--trc-temp-width, 44px);
          flex-shrink: 0;
          font-size: var(--trc-temp-font-size, 13px);
          font-variant-numeric: tabular-nums;
        }
        .temp-min {
          text-align: right;
          color: var(--secondary-text-color, #9e9e9e);
          opacity: 0.85;
          margin-right: var(--trc-temp-margin, 10px);
        }
        .temp-max {
          text-align: left;
          color: var(--primary-text-color, #ffffff);
          font-weight: 600;
          margin-left: var(--trc-temp-margin, 10px);
        }
        .bar-track {
          flex: 1;
          height: var(--trc-bar-height, 18px);
          background: rgba(255, 255, 255, 0.12);
          border-radius: 999px;
          position: relative;
          overflow: visible;
        }
        .bar-track-guide {
          position: absolute;
          top: 0;
          bottom: 0;
          width: 1px;
          background: rgba(255, 255, 255, 0.14);
          pointer-events: none;
          z-index: 1;
        }
        .bar-fill {
          position: absolute;
          top: 0;
          bottom: 0;
          border-radius: 999px;
          box-shadow: 0 0 6px rgba(129, 199, 132, 0.35);
          z-index: 2;
        }
        .current-dot {
          position: absolute;
          top: 50%;
          transform: translate(-50%, -50%);
          border-radius: 50%;
          box-shadow: 0 0 4px rgba(0,0,0,0.8);
          z-index: 3;
          transition: left 0.3s ease;
        }
        .current-dot.today {
          width: var(--trc-dot-today-size, 11px);
          height: var(--trc-dot-today-size, 11px);
          background: #ffffff;
          border: 2px solid #1a1a1a;
          box-shadow: 0 0 4px rgba(0,0,0,0.85);
          z-index: 4;
        }
        .current-dot.past {
          width: var(--trc-dot-past-size, 8px);
          height: var(--trc-dot-past-size, 8px);
          background: #cfd8dc;
          border: 1.5px solid #263238;
          opacity: 0.95;
        }
      </style>
      <ha-card style="--trc-bar-height: ${barHeight}px; --trc-dot-today-size: ${dotTodaySize}px; --trc-dot-past-size: ${dotPastSize}px; --trc-font-size: ${fontSize}px; --trc-temp-font-size: ${tempFontSize}px; --trc-row-gap: ${rowGap}px; --trc-temp-margin: ${tempMargin}px; --trc-day-width: ${dayWidth}px; --trc-temp-width: ${tempWidth}px; --trc-spacer-left: ${spacerLeft}px; --trc-spacer-right: ${spacerRight}px; --trc-header-font-size: ${headerFontSize}px;">
        ${headerHtml}
        <div class="subtitle">
          ${subtitleHtml}
        </div>
        ${scaleHtml}
        <div class="rows-container">
          ${rowsHtml || '<div style="color:var(--secondary-text-color);font-size:13px;padding:8px 0;">${localize("loading", this._hass)}</div>'}
        </div>
      </ha-card>
    `;

    const sel = this.shadowRoot.getElementById("roomSelect");
    if (sel) {
      sel.addEventListener("change", (e) => this._onSelectChange(e));
    }
    const pSel = this.shadowRoot.getElementById("periodSelect");
    if (pSel) {
      pSel.addEventListener("change", (e) => this._onPeriodChange(e));
    }
  }
}

if (!customElements.get("temperature-range-card")) {
  customElements.define("temperature-range-card", TemperatureRangeCard);
}
window.customCards = window.customCards || [];
window.customCards.push({
  type: "temperature-range-card",
  name: "Temperature History & Range Card",
  description: "Visualisez et comparez l'historique thermique (amplitudes Min-Max) de vos capteurs sur plusieurs jours, semaines ou mois avec l'élégance Apple Weather.",
  preview: true
});
