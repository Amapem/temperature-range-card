/**
 * Temperature History & Range Card (Style iOS Weather / Apple Weather)
 * v5.0.0 : audit de code
 *  - Échappement HTML de toutes les données utilisateur / Home Assistant (anti-injection)
 *  - Internationalisation complète (plus aucun texte français codé en dur)
 *  - Protection contre les réponses concurrentes (changement rapide de capteur / période)
 *  - Rafraîchissement périodique, getCardSize / getGridOptions, rendu différé si menu ouvert
 *  - Refactorisation (constantes, agrégation unique semaines / mois / années, helpers WebSocket)
 * Historique complet des versions : README et releases GitHub.
 */

const DEFAULT_PERIODS = ["10d", "20d", "30d", "20w", "12m"];
const DEFAULT_PERIOD = "10d";
const DEFAULT_BAR_HEIGHT = 18;
const MIN_BAR_HEIGHT = 6;
const MAX_BAR_HEIGHT = 60;
const MIN_BAR_WIDTH_PCT = 6;
const MS_PER_DAY = 86400000;
const HISTORY_MAX_DAYS = 31;
const REFRESH_INTERVAL_MS = 15 * 60 * 1000;
const TEMPERATURE_UNITS = ["°C", "°F", "K"];
const BAR_GRADIENT = "linear-gradient(90deg, #43a047 0%, #81c784 25%, #fdd835 55%, #fb8c00 80%, #e53935 100%)";

const HTML_ESCAPES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

function escapeHtml(value) {
  return String(value === undefined || value === null ? "" : value).replace(/[&<>"']/g, c => HTML_ESCAPES[c]);
}

function clampBarHeight(value) {
  return Math.max(MIN_BAR_HEIGHT, Math.min(MAX_BAR_HEIGHT, parseInt(value, 10) || DEFAULT_BAR_HEIGHT));
}

function getISOWeekInfo(d) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return {
    year: date.getUTCFullYear(),
    week: Math.ceil((((date - yearStart) / MS_PER_DAY) + 1) / 7)
  };
}

function getISOWeekNumber(d) {
  return getISOWeekInfo(d).week;
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

function cleanString(val) {
  if (typeof val !== "string") return "";
  const trimmed = val.trim();
  return (trimmed === "[object Object]" || trimmed === "undefined" || trimmed === "null") ? "" : trimmed;
}

function extractEntityId(val) {
  if (!val) return "";
  if (typeof val === "string") return cleanString(val);
  if (typeof val === "object") {
    return extractEntityId(val.entity_id || val.entity || val.value || val.id || "");
  }
  return "";
}

function extractEntityName(nameVal) {
  return cleanString(nameVal);
}

// Température : unité ou device_class reconnus (attributs uniquement)
function isTemperatureEntity(stateObj) {
  const attrs = (stateObj && stateObj.attributes) || {};
  return TEMPERATURE_UNITS.includes(attrs.unit_of_measurement) || attrs.device_class === "temperature";
}

// forEditor : conserve les lignes sans entité (capteur en cours d'ajout) ; sinon nom par défaut = id sans préfixe
function normalizeEntities(rawEntities, { forEditor = false } = {}) {
  if (!Array.isArray(rawEntities)) return [];
  return rawEntities.map(e => {
    if (!e) return null;
    let id = "";
    let name = "";
    if (typeof e === "string") {
      id = extractEntityId(e);
    } else if (typeof e === "object") {
      id = extractEntityId(e.entity || e.entity_id || e.value || e);
      name = extractEntityName(e.name);
    } else {
      return null;
    }
    if (forEditor) return (id || typeof e === "object") ? { entity: id, name } : null;
    return id ? { entity: id, name: name || id.replace("sensor.", "") } : null;
  }).filter(Boolean);
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
    no_stats_notice: "No statistical data available for this duration.<br><small style='opacity:0.8;'>Home Assistant requires the <code>state_class: measurement</code> attribute on the sensor for long-term statistics.</small>",
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
    no_stats_notice: "Aucune donnée statistique disponible pour cette durée.<br><small style='opacity:0.8;'>Home Assistant nécessite l'attribut <code>state_class: measurement</code> sur l'entité pour enregistrer l'historique étendu.</small>",
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
    no_stats_notice: "Keine statistischen Daten für diesen Zeitraum verfügbar.<br><small style='opacity:0.8;'>Home Assistant benötigt das Attribut <code>state_class: measurement</code> für Langzeitstatistiken.</small>",
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
    no_stats_notice: "No hay datos estadísticos disponibles para este período.<br><small style='opacity:0.8;'>Home Assistant requiere el atributo <code>state_class: measurement</code> para estadísticas a largo plazo.</small>",
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
    no_stats_notice: "Nessun dato statistico disponibile per questo periodo.<br><small style='opacity:0.8;'>Home Assistant richiede l'attributo <code>state_class: measurement</code> per le statistiche a lungo termine.</small>",
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
    no_stats_notice: "Geen statistische gegevens beschikbaar voor deze periode.<br><small style='opacity:0.8;'>Home Assistant vereist het attribuut <code>state_class: measurement</code> voor langetermijnstatistieken.</small>",
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

// Clés ajoutées lors de l'audit v5.0.0 (textes auparavant codés en dur en français)
const EXTRA_TRANSLATIONS = {
  en: {
    sensor_n: "Sensor #{index}", remove: "Remove", choose_zone: "Choose zone", period_grouping: "Period & grouping",
    min: "Min", max: "Max", legend_current: "Current temp ({time})", legend_same_time: "Same time ({time}) past days",
    legend_same_time_recent: "Same time (last {count} days)", legend_minmax: "Min-Max bars over {count} days",
    week_label: "Week {week}", week_label_current: "Wk {week} (Today)", entity_placeholder: "sensor.my_temperature_sensor"
  },
  fr: {
    sensor_n: "Capteur n°{index}", remove: "Retirer", choose_zone: "Choisir la zone", period_grouping: "Période & regroupement",
    min: "Min", max: "Max", legend_current: "T° actuelle ({time})", legend_same_time: "Même heure ({time}) les jours passés",
    legend_same_time_recent: "Même heure (sur les {count} jours récents)", legend_minmax: "Barres Min-Max sur {count} jours",
    week_label: "Semaine {week}", week_label_current: "Sem. {week} (Auj.)", entity_placeholder: "sensor.mon_capteur_temperature"
  },
  de: {
    sensor_n: "Sensor Nr. {index}", remove: "Entfernen", choose_zone: "Zone wählen", period_grouping: "Zeitraum & Gruppierung",
    min: "Min", max: "Max", legend_current: "Aktuelle Temp. ({time})", legend_same_time: "Gleiche Zeit ({time}) vergangene Tage",
    legend_same_time_recent: "Gleiche Zeit (letzte {count} Tage)", legend_minmax: "Min-Max-Balken über {count} Tage",
    week_label: "Woche {week}", week_label_current: "Wo. {week} (Heute)", entity_placeholder: "sensor.mein_temperatursensor"
  },
  es: {
    sensor_n: "Sensor n.º {index}", remove: "Quitar", choose_zone: "Elegir zona", period_grouping: "Período y agrupación",
    min: "Mín", max: "Máx", legend_current: "T° actual ({time})", legend_same_time: "Misma hora ({time}) días anteriores",
    legend_same_time_recent: "Misma hora (últimos {count} días)", legend_minmax: "Barras Mín-Máx sobre {count} días",
    week_label: "Semana {week}", week_label_current: "Sem. {week} (Hoy)", entity_placeholder: "sensor.mi_sensor_temperatura"
  },
  it: {
    sensor_n: "Sensore n. {index}", remove: "Rimuovi", choose_zone: "Scegli la zona", period_grouping: "Periodo e raggruppamento",
    min: "Min", max: "Max", legend_current: "T° attuale ({time})", legend_same_time: "Stessa ora ({time}) giorni passati",
    legend_same_time_recent: "Stessa ora (ultimi {count} giorni)", legend_minmax: "Barre Min-Max su {count} giorni",
    week_label: "Settimana {week}", week_label_current: "Sett. {week} (Oggi)", entity_placeholder: "sensor.mio_sensore_temperatura"
  },
  nl: {
    sensor_n: "Sensor #{index}", remove: "Verwijderen", choose_zone: "Zone kiezen", period_grouping: "Periode & groepering",
    min: "Min", max: "Max", legend_current: "Huidige temp. ({time})", legend_same_time: "Zelfde tijd ({time}) afgelopen dagen",
    legend_same_time_recent: "Zelfde tijd (laatste {count} dagen)", legend_minmax: "Min-Max-balken over {count} dagen",
    week_label: "Week {week}", week_label_current: "Wk {week} (Vandaag)", entity_placeholder: "sensor.mijn_temperatuursensor"
  }
};
for (const lang of Object.keys(EXTRA_TRANSLATIONS)) {
  Object.assign(TRANSLATIONS[lang], EXTRA_TRANSLATIONS[lang]);
}

function getRawLang(hass, fallback) {
  return (hass && (hass.locale?.language || hass.language)) || fallback;
}

function localize(key, hass, placeholders = {}) {
  const lang = getRawLang(hass, "en").toLowerCase().split("-")[0];
  const dict = TRANSLATIONS[lang] || TRANSLATIONS.en;
  let text = dict[key] || TRANSLATIONS.en[key] || key;
  for (const [k, v] of Object.entries(placeholders)) {
    text = text.split(`{${k}}`).join(String(v));
  }
  return text;
}

function getUserLocale(hass) {
  return getRawLang(hass, "en-US");
}

const PERIOD_ICONS = { d: "📅 ", w: "🗓️ ", m: "🗓️ ", y: "📆 " };

function formatPeriodLabel(periodStr, hass) {
  const p = parsePeriod(periodStr);
  const key = `period_${p.unit}_${p.count === 1 ? "single" : "plural"}`;
  return `${PERIOD_ICONS[p.unit] || ""}${localize(key, hass, { count: p.count })}`;
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
      title: "",
      default_period: "10d",
      show_scale: true,
      show_current: false,
      gradient_mode: "global",
      bar_height: DEFAULT_BAR_HEIGHT,
      available_periods: [...DEFAULT_PERIODS],
      entities: []
    }, structuredClone(config));

    if (!Array.isArray(newConfig.available_periods) || newConfig.available_periods.length === 0) {
      newConfig.available_periods = [...DEFAULT_PERIODS];
    } else {
      newConfig.available_periods = sortPeriods(newConfig.available_periods);
    }

    if (Array.isArray(newConfig.entities)) {
      newConfig.entities = normalizeEntities(newConfig.entities, { forEditor: true });
    } else if (newConfig.entity) {
      const singleId = extractEntityId(newConfig.entity);
      newConfig.entities = singleId ? [{ entity: singleId, name: extractEntityName(newConfig.name) }] : [];
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
    const barHeight = clampBarHeight(this._config.bar_height);
    const availablePeriods = sortPeriods(this._config.available_periods || [...DEFAULT_PERIODS]);
    const commonPresets = sortPeriods(["2d", "7d", "10d", "14d", "15d", "20d", "30d", "1w", "4w", "8w", "10w", "20w", "3m", "6m", "12m", "24m", "1y", "2y", "3y", "5y"]);

    const entitiesHtml = entities.map((item, index) => {
      const isExpanded = this._expandedSet && this._expandedSet.has(index);
      const safeName = extractEntityName(item.name);
      const safeEntity = extractEntityId(item.entity);
      const displayName = safeName || safeEntity || localize("sensor_n", this._hass, { index: index + 1 });
      return `
        <div class="entity-card ${isExpanded ? "expanded" : "collapsed"}" data-index="${index}" draggable="true">
          <div class="entity-card-header" data-action="toggle-expand" data-index="${index}">
            <div class="entity-card-title">
              <span class="entity-icon">🌡️</span>
              <span class="entity-title-text" title="${escapeHtml(displayName)}">${escapeHtml(displayName)}</span>
            </div>
            <div class="entity-actions">
              <button class="btn-icon" data-action="up" data-index="${index}" title="${localize("move_up", this._hass)}" aria-label="${localize("move_up", this._hass)}" ${index === 0 ? "disabled" : ""}>▲</button>
              <button class="btn-icon" data-action="down" data-index="${index}" title="${localize("move_down", this._hass)}" aria-label="${localize("move_down", this._hass)}" ${index === entities.length - 1 ? "disabled" : ""}>▼</button>
              <button class="btn-icon btn-delete" data-action="delete" data-index="${index}" title="${localize("delete_sensor", this._hass)}" aria-label="${localize("delete_sensor", this._hass)}">✕</button>
              <button class="btn-icon btn-chevron" data-action="toggle-expand" data-index="${index}" title="${localize(isExpanded ? "collapse" : "expand", this._hass)}" aria-label="${localize(isExpanded ? "collapse" : "expand", this._hass)}">
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
              <input type="text" class="form-input entity-name-input" data-index="${index}" value="${escapeHtml(item.name || "")}" placeholder="${localize("custom_name_placeholder", this._hass)}">
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
            <input type="text" id="title-input" class="form-input" value="${escapeHtml(this._config.title || "")}" placeholder="${localize("card_title_placeholder", this._hass)}">
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
              <span class="form-label">${localize("bar_thickness_label", this._hass)} : <strong>${barHeight} px</strong></span>
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
                <span class="chip-remove" data-action="remove-period" data-index="${idx}" title="${localize("remove", this._hass)}" aria-label="${localize("remove", this._hass)}">✕</span>
              </div>
            `).join("")}
          </div>

          <div class="form-group" style="margin-top: 8px;">
            <label class="form-label">${localize("quick_suggestions", this._hass)}</label>
            <div class="pills-group">
              ${commonPresets.filter(pr => !availablePeriods.some(ap => parsePeriod(ap).raw === parsePeriod(pr).raw)).map(pr => `
                <span class="preset-badge" data-action="add-preset" data-period="${pr}">+ ${formatPeriodLabel(pr, this._hass)} (${pr})</span>
              `).join("") || `<span style="font-size:11px;color:var(--secondary-text-color);">${localize("all_added", this._hass)}</span>`}
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
            ${entitiesHtml || `<div style="color:var(--secondary-text-color); font-size:12px; font-style:italic; padding:6px 0;">${localize("no_sensors_configured", this._hass)}</div>`}
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
        const val = clampBarHeight(e.target.value);
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
        const val = clampBarHeight(e.target.value);
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
          if (isTemperatureEntity(stateObj)) return true;
          const id = (stateObj.entity_id || "").toLowerCase();
          return id.includes("temp_") || id.includes("_temp") || id.includes("temperature");
        };
        picker.label = localize("ha_entity", this._hass);
        picker.required = true;
        picker.addEventListener("value-changed", (ev) => {
          ev.stopPropagation();
          const rawVal = ev.detail && ev.detail.value !== undefined ? ev.detail.value : ev.target?.value;
          const newEntity = extractEntityId(rawVal);
          if (newEntity !== undefined && newEntity !== item.entity) {
            item.entity = newEntity;
            if (!item.name && this._hass && this._hass.states[newEntity]) {
              item.name = this._hass.states[newEntity].attributes?.friendly_name || newEntity.replace("sensor.", "");
            }
            if (!extractEntityId(this._config.default_entity) && newEntity) {
              this._config.default_entity = newEntity;
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
        input.placeholder = localize("entity_placeholder", this._hass);
        input.addEventListener("change", (ev) => {
          const newEntity = extractEntityId(ev.target.value);
          item.entity = newEntity;
          if (!extractEntityId(this._config.default_entity) && newEntity) {
            this._config.default_entity = newEntity;
          }
          this._fireConfigChanged();
          this._render();
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
              const displayName = ev.target.value || this._config.entities[idx].entity || localize("sensor_n", this._hass, { index: idx + 1 });
              titleEl.textContent = displayName;
              titleEl.title = displayName;
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

    // Empêcher le clic sur la zone d'actions de déplier/replier la carte (remplace l'ancien onclick inline)
    this.shadowRoot.querySelectorAll(".entity-actions").forEach(el => {
      el.addEventListener("click", (e) => e.stopPropagation());
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
          const remainingValid = this._config.entities.filter(e => e && extractEntityId(e.entity));
          if (!remainingValid.some(e => e.entity === this._config.default_entity)) {
            this._config.default_entity = remainingValid[0] ? remainingValid[0].entity : "";
          }
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

  static getStubConfig(hass, entities, entitiesFallback) {
    const states = (hass && hass.states) || {};
    const list = [entities, entitiesFallback].find(l => Array.isArray(l) && l.length) || [];
    const isTemp = (id) => isTemperatureEntity(states[id]);
    const candidate = list.find(isTemp)
      || Object.keys(states).find(id => id.startsWith("sensor.") && isTemp(id))
      || "";

    return {
      type: "custom:temperature-range-card",
      title: localize("card_title_default", hass),
      show_scale: true,
      show_current: false,
      gradient_mode: "global",
      bar_height: DEFAULT_BAR_HEIGHT,
      available_periods: [...DEFAULT_PERIODS],
      entities: candidate ? [{
        entity: candidate,
        name: states[candidate]?.attributes?.friendly_name || candidate.replace("sensor.", "")
      }] : []
    };
  }

  setConfig(config) {
    this.config = Object.assign({
      title: "",
      show_scale: true,
      show_current: false,
      default_period: DEFAULT_PERIOD,
      gradient_mode: "global",
      bar_height: DEFAULT_BAR_HEIGHT,
      available_periods: [...DEFAULT_PERIODS]
    }, config);

    // Initialiser et assainir strictement les entités
    if (Array.isArray(this.config.entities)) {
      this._entitiesList = normalizeEntities(this.config.entities);
    } else if (this.config.entity) {
      const id = extractEntityId(this.config.entity);
      this._entitiesList = id ? [{ entity: id, name: extractEntityName(this.config.name) || id.replace("sensor.", "") }] : [];
    } else {
      this._entitiesList = [];
    }

    const savedEntity = this._readStorage("entity");
    const validSavedEntity = this._entitiesList.some(e => e.entity === savedEntity) ? savedEntity : null;
    const configDefault = extractEntityId(this.config.default_entity);
    const validConfigDefault = this._entitiesList.some(e => e.entity === configDefault) ? configDefault : null;
    this._selectedEntity = validSavedEntity || validConfigDefault || (this._entitiesList[0] ? this._entitiesList[0].entity : "");

    const rawAllowed = (Array.isArray(this.config.available_periods) && this.config.available_periods.length)
      ? this.config.available_periods
      : [...DEFAULT_PERIODS];
    const sortedAllowed = sortPeriods(rawAllowed);
    const isAllowed = (p) => !!p && sortedAllowed.some(a => parsePeriod(a).raw === parsePeriod(p).raw);

    const savedPeriod = this._readStorage("period");
    const configPeriod = this.config.default_period;
    this._selectedPeriod = isAllowed(savedPeriod) ? savedPeriod : (isAllowed(configPeriod) ? configPeriod : (sortedAllowed[0] || DEFAULT_PERIOD));

    this._history = null;
    this._stats = null;
    this._loading = false;
    this._lastState = null;
    this._lastFetchTs = 0;
    this._pendingRender = false;
    this._isCardRendered = false;
    this._reqId = (this._reqId || 0) + 1;

    if (!this.shadowRoot) {
      this.attachShadow({ mode: "open" });
    }

    if (this._hass) {
      this._render();
      if (this._selectedEntity) {
        this._fetchData();
      }
    }
  }

  connectedCallback() {
    if (this._hass && this._selectedEntity && !this._history && !this._stats && !this._loading) {
      this._fetchData();
    }
  }

  disconnectedCallback() {
    // Invalide toute requête en vol : sa réponse sera ignorée
    this._reqId = (this._reqId || 0) + 1;
    this._loading = false;
  }

  getCardSize() {
    const { count } = parsePeriod(this._selectedPeriod || DEFAULT_PERIOD);
    const rows = Math.min(count, 60);
    const barHeight = clampBarHeight(this.config && this.config.bar_height);
    return Math.max(3, Math.ceil(2.5 + (rows * (barHeight + 10)) / 50));
  }

  getGridOptions() {
    return { columns: 12, min_columns: 6 };
  }

  set hass(hass) {
    this._hass = hass;
    if (!this.shadowRoot) {
      this.attachShadow({ mode: "open" });
    }

    // 1. Aucune entité configurée : écran d'attente (rendu unique)
    if (!this._entitiesList || this._entitiesList.length === 0) {
      if (!this._isCardRendered) this._render();
      return;
    }

    // 2. Entité sélectionnée absente de hass.states : bascule sur une entité valide
    let cur = hass.states[this._selectedEntity];
    if (!cur) {
      const fallback = this._entitiesList.find(e => e && e.entity && hass.states[e.entity]);
      if (fallback) {
        this._selectedEntity = fallback.entity;
        cur = hass.states[this._selectedEntity];
      }
    }

    // 3. Premier rendu
    if (!this._isCardRendered) {
      this._render();
    }

    if (!this._selectedEntity) return;

    // 4. Chargement initial, rafraîchissement de l'état ou des données historiques
    if (!this._history && !this._stats && !this._loading) {
      this._fetchData();
    } else if (cur && this._lastState !== cur.state) {
      this._lastState = cur.state;
      this._requestRender();
    } else if (!this._loading && Date.now() - (this._lastFetchTs || 0) > REFRESH_INTERVAL_MS) {
      this._fetchData();
    }
  }

  // Rendu différé si un menu déroulant a le focus (évite de le fermer pendant la sélection)
  _requestRender() {
    const active = this.shadowRoot && this.shadowRoot.activeElement;
    if (active && active.tagName === "SELECT") {
      this._pendingRender = true;
      return;
    }
    this._pendingRender = false;
    this._render();
  }

  _wsStats(period, start) {
    return this._hass.callWS({
      type: "recorder/statistics_during_period",
      start_time: start.toISOString(),
      statistic_ids: [this._selectedEntity],
      period
    }).then(res => (res && res[this._selectedEntity]) || []);
  }

  _wsHistory(start) {
    return this._hass.callWS({
      type: "history/history_during_period",
      start_time: start.toISOString(),
      entity_ids: [this._selectedEntity],
      minimal_response: true,
      no_attributes: true
    }).then(res => (res && res[this._selectedEntity]) || []);
  }

  async _fetchData() {
    if (!this._selectedEntity) {
      this._loading = false;
      return;
    }
    // Jeton anti-concurrence : seule la dernière requête lancée peut mettre à jour la carte
    const reqId = ++this._reqId;
    this._loading = true;
    try {
      const { count, unit } = parsePeriod(this._selectedPeriod);
      const now = Date.now();
      let history = [];
      let stats = [];

      if (unit === "d") {
        // Min/max journaliers exacts (LTS) + historique brut pour les points « même heure »
        const statsStart = new Date(now);
        statsStart.setDate(statsStart.getDate() - (count + 1));
        statsStart.setHours(0, 0, 0, 0);
        const histStart = new Date(now);
        histStart.setDate(histStart.getDate() - (Math.min(count, HISTORY_MAX_DAYS) + 1));
        histStart.setHours(0, 0, 0, 0);
        [history, stats] = await Promise.all([this._wsHistory(histStart), this._wsStats("day", statsStart)]);
      } else {
        const spanDays = unit === "w" ? (count + 2) * 7 : (unit === "m" ? count * 32 + 10 : count * 366 + 35);
        stats = await this._wsStats(unit === "w" ? "week" : "month", new Date(now - spanDays * MS_PER_DAY));
        // Repli sur l'historique brut si aucune statistique LTS n'est disponible (sauf vue annuelle)
        if (unit !== "y" && !stats.length) {
          try {
            history = await this._wsHistory(new Date(now - HISTORY_MAX_DAYS * MS_PER_DAY));
          } catch (e) {
            console.debug("temperature-range-card: historique brut indisponible", e);
          }
        }
      }

      if (reqId !== this._reqId) return;
      this._history = history;
      this._stats = stats;
    } catch (e) {
      if (reqId !== this._reqId) return;
      console.error("temperature-range-card: erreur de récupération des données", e);
      // Évite une boucle de re-requêtes à chaque mise à jour de hass
      this._history = [];
      this._stats = [];
    }
    this._loading = false;
    this._lastFetchTs = Date.now();
    this._requestRender();
  }

  _getStorageKey(suffix) {
    const listStr = (this._entitiesList || []).map(e => e.entity).sort().join(",");
    let hash = 0;
    for (let i = 0; i < listStr.length; i++) {
      hash = ((hash << 5) - hash) + listStr.charCodeAt(i);
      hash |= 0;
    }
    return `trc_${Math.abs(hash)}_${suffix}`;
  }

  _readStorage(suffix) {
    try {
      return localStorage.getItem(this._getStorageKey(suffix));
    } catch (_) {
      return null;
    }
  }

  _writeStorage(suffix, value) {
    try {
      localStorage.setItem(this._getStorageKey(suffix), value);
    } catch (_) {
      // Stockage indisponible (navigation privée) : la sélection ne sera simplement pas mémorisée
    }
  }

  _resetAndFetch() {
    this._history = null;
    this._stats = null;
    this._render();
    this._fetchData();
  }

  _onSelectChange(e) {
    this._selectedEntity = e.target.value;
    this._writeStorage("entity", this._selectedEntity);
    this._resetAndFetch();
  }

  _onPeriodChange(e) {
    this._selectedPeriod = e.target.value;
    this._writeStorage("period", this._selectedPeriod);
    this._resetAndFetch();
  }

  // Lignes de la vue « jours » : historique brut (jours récents) complété par les statistiques LTS
  _computeDayRows({ count, now, nowTimeStr, userLocale, cur }) {
    const rowsList = [];
    let subtitleHtml = "";
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

        // L'état en vigueur à 00:00 (reporté de la veille) fait partie de la plage du jour
        const dayStart = new Date(targetDate);
        dayStart.setHours(0, 0, 0, 0);
        const startTs = Math.floor(dayStart.getTime() / 1000);
        if (startTs >= earliestHistTs) {
          let carried = null;
          for (const pt of this._history) {
            if (pt.lu <= startTs) {
              const v = parseFloat(pt.s);
              if (!isNaN(v)) carried = v;
            } else break;
          }
          if (carried !== null) {
            dayMin = Math.min(dayMin, carried);
            dayMax = Math.max(dayMax, carried);
          }
        }
        // La valeur "même heure" doit toujours être dans la barre
        if (sameTimeVal !== null) {
          dayMin = Math.min(dayMin, sameTimeVal);
          dayMax = Math.max(dayMax, sameTimeVal);
        }
      } else if (sameTimeVal !== null && !isToday) {
        // Journée plate : aucun changement d'état enregistré, la valeur reportée fait foi
        dayMin = sameTimeVal;
        dayMax = sameTimeVal;
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
        <span class="legend-item"><span class="legend-dot today"></span> ${localize("legend_current", this._hass, { time: nowTimeStr })}</span>
        <span class="legend-item"><span class="legend-dot past"></span> ${localize("legend_same_time", this._hass, { time: nowTimeStr })}</span>
      `;
    } else {
      subtitleHtml = `
        <span class="legend-item"><span class="legend-dot today"></span> ${localize("legend_current", this._hass, { time: nowTimeStr })}</span>
        <span class="legend-item"><span class="legend-dot past"></span> ${localize("legend_same_time_recent", this._hass, { count: pointsAvailableCount })}</span>
        <span class="legend-item" style="opacity:0.8;">${localize("legend_minmax", this._hass, { count: daysCount })}</span>
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


    return { rowsList, subtitleHtml };
  }

  // Lignes des vues « semaines / mois / années » : agrégation par clé calendaire
  _computeAggregateRows(unit, { count, now, userLocale, currentTempValue }) {
    const hass = this._hass;
    const curVal = currentTempValue !== null ? parseFloat(currentTempValue) : null;
    const pad = (n) => String(n).padStart(2, "0");
    const capitalize = (str) => str.charAt(0).toUpperCase() + str.slice(1);

    let subtitleHtml;
    let keyOf;
    let labelOf;
    let offsetDays;
    if (unit === "w") {
      subtitleHtml = `<span>${localize("subtitle_weeks", hass, { count })}</span>`;
      offsetDays = 2;
      keyOf = (d) => { const w = getISOWeekInfo(d); return `${w.year}-W${pad(w.week)}`; };
      labelOf = (d, isCurrent) => localize(isCurrent ? "week_label_current" : "week_label", hass, { week: getISOWeekNumber(d) });
    } else if (unit === "m") {
      subtitleHtml = `<span>${localize("subtitle_months", hass, { count })}</span>`;
      offsetDays = 5;
      keyOf = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
      labelOf = (d) => capitalize(d.toLocaleDateString(userLocale, { month: "short", year: "2-digit" }));
    } else {
      subtitleHtml = count === 1
        ? `<span>${localize("subtitle_year_single", hass)}</span>`
        : `<span>${localize("subtitle_years", hass, { count })}</span>`;
      offsetDays = 5;
      keyOf = (d) => String(d.getFullYear());
      labelOf = (d, isCurrent) => isCurrent ? `${d.getFullYear()} (${localize("in_progress", hass)})` : String(d.getFullYear());
    }

    // Points sources : statistiques LTS, sinon historique brut (vues semaines/mois uniquement)
    const points = [];
    if (this._stats && this._stats.length) {
      for (const st of this._stats) {
        points.push({ date: new Date(st.start + offsetDays * MS_PER_DAY), min: st.min, max: st.max });
      }
    } else if (this._history && this._history.length) {
      for (const pt of this._history) {
        const v = parseFloat(pt.s);
        if (!isNaN(v)) points.push({ date: new Date(pt.lu * 1000), min: v, max: v });
      }
    }
    if (!points.length) return { rowsList: [], subtitleHtml };

    const groups = new Map();
    const merge = (key, date, mn, mx) => {
      const lo = (mn === undefined) ? null : mn;
      const hi = (mx === undefined) ? null : mx;
      const g = groups.get(key);
      if (!g) {
        groups.set(key, { date, min: lo, max: hi });
        return;
      }
      if (lo !== null && (g.min === null || lo < g.min)) g.min = lo;
      if (hi !== null && (g.max === null || hi > g.max)) g.max = hi;
    };
    for (const p of points) merge(keyOf(p.date), p.date, p.min, p.max);

    // La valeur actuelle est intégrée en temps réel à la période en cours
    const currentKey = keyOf(now);
    if (curVal !== null) merge(currentKey, now, curVal, curVal);

    const rowsList = [...groups.keys()].sort().reverse().slice(0, count).map(k => {
      const g = groups.get(k);
      const isCurrent = k === currentKey;
      return {
        label: labelOf(g.date, isCurrent),
        min: g.min,
        max: g.max,
        sameTimeVal: isCurrent ? curVal : null,
        isToday: isCurrent
      };
    });
    return { rowsList, subtitleHtml };
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
            display: block;
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
          <div class="empty-title">${escapeHtml(this.config.title || localize("card_title_default", this._hass))}</div>
          <div class="empty-desc">
            ${localize("no_sensors_title", this._hass)}<br>${localize("no_sensors_desc", this._hass)}
          </div>
        </ha-card>
      `;
      this._isCardRendered = true;
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
      : [...DEFAULT_PERIODS];

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
    const nowTimeStr = now.toLocaleTimeString(userLocale, { hour: "2-digit", minute: "2-digit" });

    const rowsCtx = { count, now, nowTimeStr, userLocale, cur, currentTempValue };
    const { rowsList, subtitleHtml } = unit === "d"
      ? this._computeDayRows(rowsCtx)
      : this._computeAggregateRows(unit, rowsCtx);

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

    const barHeight = clampBarHeight(this.config.bar_height);
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
            <span class="scale-header-min">${localize("min", this._hass)}</span>
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
            <span class="scale-header-max">${localize("max", this._hass)}</span>
          </div>
        </div>
      `;
    } else if (rowsList.length > 0) {
      scaleHtml = `
        <div class="scale-row no-track">
          <div class="scale-spacer-left">
            <span></span>
            <span class="scale-header-min">${localize("min", this._hass)}</span>
          </div>
          <div class="scale-track" style="height:0; opacity:0; pointer-events:none;"></div>
          <div class="scale-spacer-right">
            <span class="scale-header-max">${localize("max", this._hass)}</span>
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
        const rawWidthPct = rightPct - leftPct;
        widthPct = Math.max(MIN_BAR_WIDTH_PCT, rawWidthPct);
        // Barre étroite (journée plate ou quasi) : la centrer sur sa plage pour qu'elle reste alignée avec le point blanc
        if (rawWidthPct < widthPct) {
          leftPct = leftPct + rawWidthPct / 2 - widthPct / 2;
        }
        leftPct = Math.max(0, Math.min(leftPct, 100 - widthPct));
      }

      let dotHtml = "";
      if (d.sameTimeVal !== null) {
        const dotPct = Math.max(0, Math.min(100, ((d.sameTimeVal - globalMin) / globalSpan) * 100));
        const dotClass = d.isToday ? "current-dot today" : "current-dot past";
        const dotTitle = d.isToday
          ? `${localize("current_temp", this._hass)} : ${d.sameTimeVal.toFixed(1)}${unitMeasure}`
          : `${localize("same_time", this._hass)} (${nowTimeStr}) : ${d.sameTimeVal.toFixed(1)}${unitMeasure}`;
        // Le point reste entièrement à l'intérieur de la barre (jamais à cheval sur son extrémité arrondie)
        const dotR = Math.ceil((d.isToday ? dotTodaySize : dotPastSize) / 2) + 1;
        const dotLeft = (d.min !== null && d.max !== null)
          ? `clamp(calc(${leftPct}% + ${dotR}px), ${dotPct}%, calc(${leftPct + widthPct}% - ${dotR}px))`
          : `${dotPct}%`;
        dotHtml = `<div class="${dotClass}" style="left:${dotLeft};" title="${escapeHtml(dotTitle)}"></div>`;
      }

      const todayClass = d.isToday ? "today" : "";

      const gradientColors = BAR_GRADIENT;
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
          <div class="day-label ${todayClass}">${escapeHtml(d.label)}</div>
          <div class="temp temp-min">${minVal}°</div>
          <div class="bar-track" role="img" aria-label="${escapeHtml(d.label)} : ${minVal}° – ${maxVal}°" style="height:${barHeight}px;">
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
          <select id="roomSelect" class="entity-select" title="${localize("choose_zone", this._hass)}" aria-label="${localize("choose_zone", this._hass)}">
            ${this._entitiesList.map(e => `
              <option value="${escapeHtml(e.entity)}" ${e.entity === this._selectedEntity ? "selected" : ""}>
                ${escapeHtml(e.name || e.entity)}
              </option>
            `).join("")}
          </select>
        </div>
        <div class="select-wrapper">
          <select id="periodSelect" class="entity-select period-select" title="${localize("period_grouping", this._hass)}" aria-label="${localize("period_grouping", this._hass)}">
            ${allowedPeriods.map(p => `
              <option value="${escapeHtml(p.id)}" ${p.normalized === currentParsed.raw ? "selected" : ""}>
                ${escapeHtml(p.label)}
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
            <div class="card-header">${escapeHtml(this.config.title || localize("card_title_default", this._hass))}</div>
            <div class="current-temp-badge" title="${localize("current_temp", this._hass)}">
              <span class="current-temp-num">${currentTempValue !== null ? currentTempValue : "--"}</span><span class="current-temp-unit">${escapeHtml(unitMeasure)}</span>
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
          <div class="card-header">${escapeHtml(this.config.title || localize("card_title_default", this._hass))}</div>
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
          display: block;
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
          ${rowsHtml || (this._loading
            ? `<div style="color:var(--secondary-text-color);font-size:13px;padding:8px 0;">${localize("loading", this._hass)}</div>`
            : `<div style="color:var(--secondary-text-color);font-size:13px;padding:12px 10px;text-align:center;line-height:1.5;">${localize("no_stats_notice", this._hass)}</div>`
          )}
        </div>
      </ha-card>
    `;

    const sel = this.shadowRoot.getElementById("roomSelect");
    if (sel) sel.addEventListener("change", (e) => this._onSelectChange(e));
    const pSel = this.shadowRoot.getElementById("periodSelect");
    if (pSel) pSel.addEventListener("change", (e) => this._onPeriodChange(e));
    // Un rendu différé (menu ouvert pendant une mise à jour) est exécuté dès que le menu perd le focus
    [sel, pSel].forEach(el => {
      if (el) el.addEventListener("blur", () => {
        if (this._pendingRender) setTimeout(() => this._requestRender(), 0);
      });
    });

    this._isCardRendered = true;
  }
}

if (!customElements.get("temperature-range-card")) {
  customElements.define("temperature-range-card", TemperatureRangeCard);
}
window.customCards = window.customCards || [];
if (!window.customCards.some(c => c.type === "temperature-range-card")) window.customCards.push({
  type: "temperature-range-card",
  name: "Temperature History & Range Card",
  description: "Visualisez et comparez l'historique thermique (amplitudes Min-Max) de vos capteurs sur plusieurs jours, semaines ou mois avec l'élégance Apple Weather.",
  preview: true
});
