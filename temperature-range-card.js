/**
 * Temperature Range Card (Style iOS Weather / Apple Weather)
 * v3.0 :
 * - Éditeur visuel interactif complet (TemperatureRangeCardEditor) pour Home Assistant Lovelace :
 *   - Gestion de la liste des capteurs : ajout, suppression, réorganisation monter/descendre, sélecteur d'entité et renommage personnalisé
 *   - Configuration de la durée par défaut (10 jours, 20 jours, 30 jours, 20 semaines, 12 mois)
 *   - Sélection des options de durée visibles dans le menu déroulant (10j, 20j, 30j, semaine, mois)
 *   - Choix du capteur affiché par défaut
 *   - Toggle pour afficher/masquer l'échelle des températures
 * - Échelle des températures graphique alignée au pixel près au-dessus des barres :
 *   - Bornes Min (0%) et Max (100%) de la plage globale de la barre grise
 *   - Valeurs et repères intermédiaires arrondis positionnés fidèlement à leur température
 *   - Lignes guides verticales discrètes dans chaque barre grise pour repérer les paliers de température
 * - Modes d'affichage sélectionnables dynamiquement :
 *   - 📅 10 jours (avec point blanc actuel et points gris à la même heure)
 *   - 📅 20 jours (barres min/max étendues, points sur les 10 jours récents)
 *   - 📅 30 jours (barres min/max étendues, points sur les 10 jours récents)
 *   - 🗓️ 20 semaines (numéros de semaine ISO : Sem. 46, Sem. 45... sur 20 semaines)
 *   - 🗓️ 12 mois (synthèse annuelle sur 12 mois complets)
 * - Support direct des statistiques long-terme Home Assistant (recorder/statistics_during_period)
 * - Mémorisation automatique des choix dans le navigateur (localStorage)
 */

function getISOWeekNumber(d) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil((((date - yearStart) / 86400000) + 1) / 7);
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
  }

  setConfig(config) {
    this._config = Object.assign({
      title: "Comparatif & Amplitudes Thermiques",
      default_period: "10d",
      show_scale: true,
      available_periods: ["10d", "20d", "30d", "week", "month"],
      entities: []
    }, structuredClone(config));

    if (!Array.isArray(this._config.available_periods) || this._config.available_periods.length === 0) {
      this._config.available_periods = ["10d", "20d", "30d", "week", "month"];
    }

    if (Array.isArray(this._config.entities)) {
      this._config.entities = this._config.entities.map(e => {
        if (typeof e === "string") return { entity: e, name: "" };
        return { entity: e.entity || "", name: e.name || "" };
      });
    } else if (this._config.entity) {
      this._config.entities = [{ entity: this._config.entity, name: this._config.name || "" }];
    } else {
      this._config.entities = [];
    }

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
      detail: { config: this._config },
      bubbles: true,
      composed: true
    });
    this.dispatchEvent(event);
  }

  _render() {
    if (!this.shadowRoot || !this._config) return;

    const entities = this._config.entities || [];
    const showScale = this._config.show_scale !== false;
    const availablePeriods = this._config.available_periods || ["10d", "20d", "30d", "week", "month"];
    const defaultPeriod = this._config.default_period || "10d";
    const defaultEntity = this._config.default_entity || (entities[0] ? entities[0].entity : "");

    const periodDefinitions = [
      { id: "10d", label: "📅 10 jours" },
      { id: "20d", label: "📅 20 jours" },
      { id: "30d", label: "📅 30 jours" },
      { id: "week", label: "🗓️ 20 semaines" },
      { id: "month", label: "🗓️ 12 mois" }
    ];

    const entitiesHtml = entities.map((item, index) => {
      const displayName = item.name || item.entity || `Capteur #${index + 1}`;
      return `
        <div class="entity-card" data-index="${index}">
          <div class="entity-card-header">
            <div class="entity-card-title">
              <span class="entity-num">#${index + 1}</span>
              <span class="entity-title-text" title="${displayName}">${displayName}</span>
            </div>
            <div class="entity-actions">
              <button class="btn-icon" data-action="up" data-index="${index}" title="Monter" ${index === 0 ? "disabled" : ""}>▲</button>
              <button class="btn-icon" data-action="down" data-index="${index}" title="Descendre" ${index === entities.length - 1 ? "disabled" : ""}>▼</button>
              <button class="btn-icon btn-delete" data-action="delete" data-index="${index}" title="Supprimer">✕</button>
            </div>
          </div>
          <div class="entity-card-body">
            <div class="form-group">
              <label class="form-label">Entité Home Assistant (Capteur)</label>
              <div class="picker-slot" data-index="${index}"></div>
            </div>
            <div class="form-group">
              <label class="form-label">Nom d'affichage personnalisé</label>
              <input type="text" class="form-input entity-name-input" data-index="${index}" value="${item.name || ""}" placeholder="Ex: 🌳 T° Extérieure, 🛋️ Salon...">
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
          gap: 20px;
          padding: 8px 0;
        }
        .section-box {
          background: var(--ha-card-background, rgba(255, 255, 255, 0.03));
          border: 1px solid var(--divider-color, rgba(255, 255, 255, 0.12));
          border-radius: 12px;
          padding: 16px;
        }
        .section-title {
          font-size: 15px;
          font-weight: 600;
          color: var(--primary-text-color, #ffffff);
          margin-bottom: 14px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
          margin-bottom: 14px;
        }
        .form-group:last-child {
          margin-bottom: 0;
        }
        .form-label {
          font-size: 12px;
          font-weight: 500;
          color: var(--secondary-text-color, #9e9e9e);
        }
        .form-input, .form-select {
          width: 100%;
          background: rgba(255, 255, 255, 0.06);
          color: var(--primary-text-color, #ffffff);
          border: 1px solid rgba(255, 255, 255, 0.18);
          border-radius: 8px;
          padding: 9px 12px;
          font-size: 14px;
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
          gap: 8px;
          margin-top: 4px;
        }
        .period-pill {
          padding: 7px 14px;
          border-radius: 20px;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          user-select: none;
          transition: all 0.2s ease;
          border: 1px solid rgba(255, 255, 255, 0.15);
          background: rgba(255, 255, 255, 0.04);
          color: var(--secondary-text-color, #9e9e9e);
        }
        .period-pill.active {
          background: var(--primary-color, #03a9f4);
          color: #ffffff;
          font-weight: 600;
          border-color: var(--primary-color, #03a9f4);
          box-shadow: 0 2px 8px rgba(3, 169, 244, 0.35);
        }
        .switch-container {
          display: flex;
          align-items: center;
          gap: 12px;
          cursor: pointer;
          user-select: none;
          font-size: 14px;
          color: var(--primary-text-color);
          margin-top: 6px;
        }
        .switch-container input {
          display: none;
        }
        .switch-slider {
          position: relative;
          width: 42px;
          height: 22px;
          background-color: rgba(255, 255, 255, 0.2);
          border-radius: 22px;
          transition: 0.25s ease;
          flex-shrink: 0;
        }
        .switch-slider::before {
          position: absolute;
          content: "";
          height: 16px;
          width: 16px;
          left: 3px;
          bottom: 3px;
          background-color: white;
          border-radius: 50%;
          transition: 0.25s ease;
        }
        .switch-container input:checked + .switch-slider {
          background-color: var(--primary-color, #03a9f4);
        }
        .switch-container input:checked + .switch-slider::before {
          transform: translateX(20px);
        }
        .entities-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
          margin-bottom: 14px;
        }
        .entity-card {
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid var(--divider-color, rgba(255, 255, 255, 0.1));
          border-radius: 10px;
          overflow: hidden;
          transition: border-color 0.2s ease;
        }
        .entity-card:hover {
          border-color: rgba(255, 255, 255, 0.25);
        }
        .entity-card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: rgba(255, 255, 255, 0.04);
          padding: 8px 12px;
          border-bottom: 1px solid var(--divider-color, rgba(255, 255, 255, 0.08));
        }
        .entity-card-title {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          font-weight: 600;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .entity-num {
          font-size: 11px;
          background: rgba(255, 255, 255, 0.12);
          padding: 2px 6px;
          border-radius: 4px;
          color: var(--secondary-text-color, #9e9e9e);
        }
        .entity-title-text {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          max-width: 240px;
        }
        .entity-actions {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .btn-icon {
          background: transparent;
          border: 1px solid rgba(255, 255, 255, 0.15);
          color: var(--primary-text-color, #ffffff);
          border-radius: 6px;
          width: 28px;
          height: 28px;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          transition: all 0.2s ease;
        }
        .btn-icon:hover:not(:disabled) {
          background: rgba(255, 255, 255, 0.15);
          border-color: rgba(255, 255, 255, 0.35);
        }
        .btn-icon:disabled {
          opacity: 0.3;
          cursor: default;
        }
        .btn-delete:hover:not(:disabled) {
          background: rgba(244, 67, 54, 0.2);
          border-color: #f44336;
          color: #f44336;
        }
        .entity-card-body {
          padding: 12px;
        }
        .btn-add-sensor {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          width: 100%;
          background: rgba(3, 169, 244, 0.08);
          border: 1px dashed var(--primary-color, #03a9f4);
          color: var(--primary-color, #03a9f4);
          border-radius: 8px;
          padding: 12px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          font-family: inherit;
          transition: all 0.2s ease;
        }
        .btn-add-sensor:hover {
          background: rgba(3, 169, 244, 0.18);
        }
      </style>

      <div class="editor-container">
        <!-- Configuration Générale -->
        <div class="section-box">
          <div class="section-title">⚙️ Paramètres Généraux</div>
          
          <div class="form-group">
            <label class="form-label">Titre de la carte</label>
            <input type="text" id="title-input" class="form-input" value="${this._config.title || ""}" placeholder="Ex: Comparatif & Amplitudes Thermiques">
          </div>

          <div class="form-group">
            <label class="form-label">Capteur affiché par défaut</label>
            <select id="default-entity-select" class="form-select">
              ${entities.map(e => `
                <option value="${e.entity}" ${e.entity === defaultEntity ? "selected" : ""}>
                  ${e.name || e.entity}
                </option>
              `).join("")}
            </select>
          </div>

          <div class="form-group">
            <label class="form-label">Période d'affichage par défaut</label>
            <select id="default-period-select" class="form-select">
              <option value="10d" ${defaultPeriod === "10d" ? "selected" : ""}>📅 10 jours</option>
              <option value="20d" ${defaultPeriod === "20d" ? "selected" : ""}>📅 20 jours</option>
              <option value="30d" ${defaultPeriod === "30d" ? "selected" : ""}>📅 30 jours</option>
              <option value="week" ${defaultPeriod === "week" ? "selected" : ""}>🗓️ 20 semaines</option>
              <option value="month" ${defaultPeriod === "month" ? "selected" : ""}>🗓️ 12 mois</option>
            </select>
          </div>
        </div>

        <!-- Options d'Affichage & Durées -->
        <div class="section-box">
          <div class="section-title">📊 Options d'Affichage & Échelle</div>

          <div class="form-group">
            <label class="switch-container">
              <input type="checkbox" id="scale-toggle" ${showScale ? "checked" : ""}>
              <span class="switch-slider"></span>
              <span>Afficher l'échelle des températures sur les barres (Min, Repères, Max)</span>
            </label>
          </div>

          <div class="form-group" style="margin-top: 12px;">
            <label class="form-label">Options de durée disponibles dans le menu de la carte</label>
            <div class="pills-group">
              ${periodDefinitions.map(p => `
                <div class="period-pill ${availablePeriods.includes(p.id) ? "active" : ""}" data-period="${p.id}">
                  ${p.label}
                </div>
              `).join("")}
            </div>
          </div>
        </div>

        <!-- Liste des Capteurs Thermiques -->
        <div class="section-box">
          <div class="section-title">
            <span>🌡️ Capteurs Thermiques (${entities.length})</span>
          </div>

          <div class="entities-list">
            ${entitiesHtml || '<div style="color:var(--secondary-text-color); font-size:13px; font-style:italic;">Aucun capteur configuré. Cliquez sur le bouton ci-dessous pour en ajouter un.</div>'}
          </div>

          <button id="btn-add-sensor" class="btn-add-sensor">
            <span>+ Ajouter un capteur</span>
          </button>
        </div>
      </div>
    `;

    // Attacher les écouteurs de l'en-tête
    const titleInput = this.shadowRoot.getElementById("title-input");
    if (titleInput) {
      titleInput.addEventListener("input", (e) => {
        this._config.title = e.target.value;
        this._fireConfigChanged();
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

    // Gestion des pilules de sélection des durées disponibles
    const pills = this.shadowRoot.querySelectorAll(".period-pill");
    pills.forEach(pill => {
      pill.addEventListener("click", () => {
        const pId = pill.getAttribute("data-period");
        let current = [...(this._config.available_periods || ["10d", "20d", "30d", "week", "month"])];
        if (current.includes(pId)) {
          if (current.length > 1) {
            current = current.filter(x => x !== pId);
          }
        } else {
          current.push(pId);
        }
        this._config.available_periods = current;
        this._fireConfigChanged();
        this._render();
      });
    });

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
      input.addEventListener("input", (ev) => {
        const idx = parseInt(ev.target.getAttribute("data-index"), 10);
        if (this._config.entities[idx]) {
          this._config.entities[idx].name = ev.target.value;
          this._fireConfigChanged();
        }
      });
    });

    // Écouteurs pour les boutons d'action (monter, descendre, supprimer)
    const actionBtns = this.shadowRoot.querySelectorAll(".btn-icon");
    actionBtns.forEach(btn => {
      btn.addEventListener("click", () => {
        const action = btn.getAttribute("data-action");
        const idx = parseInt(btn.getAttribute("data-index"), 10);
        if (action === "up" && idx > 0) {
          const tmp = this._config.entities[idx];
          this._config.entities[idx] = this._config.entities[idx - 1];
          this._config.entities[idx - 1] = tmp;
          this._fireConfigChanged();
          this._render();
        } else if (action === "down" && idx < this._config.entities.length - 1) {
          const tmp = this._config.entities[idx];
          this._config.entities[idx] = this._config.entities[idx + 1];
          this._config.entities[idx + 1] = tmp;
          this._fireConfigChanged();
          this._render();
        } else if (action === "delete") {
          this._config.entities.splice(idx, 1);
          this._fireConfigChanged();
          this._render();
        }
      });
    });

    // Bouton ajouter un capteur
    const btnAdd = this.shadowRoot.getElementById("btn-add-sensor");
    if (btnAdd) {
      btnAdd.addEventListener("click", () => {
        if (!Array.isArray(this._config.entities)) {
          this._config.entities = [];
        }
        this._config.entities.push({ entity: "", name: "" });
        this._fireConfigChanged();
        this._render();
      });
    }
  }
}

customElements.define("temperature-range-card-editor", TemperatureRangeCardEditor);

// =============================================================================
// CARTE PRINCIPALE (TemperatureRangeCard)
// =============================================================================

class TemperatureRangeCard extends HTMLElement {
  static async getConfigElement() {
    return document.createElement("temperature-range-card-editor");
  }

  static getStubConfig(hass, entities) {
    const tempSensors = (entities || []).filter(e => e.startsWith("sensor.") && (e.includes("temp") || e.includes("temperature")));
    const firstSensor = tempSensors[0] || "sensor.temperature_exterieure_minimale";
    return {
      type: "custom:temperature-range-card",
      title: "Comparatif & Amplitudes Thermiques",
      default_period: "10d",
      show_scale: true,
      available_periods: ["10d", "20d", "30d", "week", "month"],
      entities: [
        { entity: firstSensor, name: "🌳 T° Extérieure" }
      ]
    };
  }

  setConfig(config) {
    this.config = Object.assign({
      title: "Amplitudes & Comparatif Journalier",
      show_scale: true,
      default_period: "10d",
      available_periods: ["10d", "20d", "30d", "week", "month"]
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
      this._entitiesList = [{ entity: "sensor.temperature_exterieure_minimale", name: "T° Extérieure" }];
    }

    const savedEntity = localStorage.getItem("temp_range_selected_entity");
    const validSavedEntity = this._entitiesList.some(e => e.entity === savedEntity) ? savedEntity : null;
    this._selectedEntity = validSavedEntity || this.config.default_entity || (this._entitiesList[0] ? this._entitiesList[0].entity : "");

    const allowed = (Array.isArray(this.config.available_periods) && this.config.available_periods.length)
      ? this.config.available_periods
      : ["10d", "20d", "30d", "week", "month"];

    const savedPeriod = localStorage.getItem("temp_range_selected_period");
    let chosenPeriod = savedPeriod || this.config.default_period || "10d";
    if (!allowed.includes(chosenPeriod)) {
      chosenPeriod = allowed[0] || "10d";
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
    this._loading = true;
    try {
      const mode = this._selectedPeriod;
      const now = Date.now();
      const statsIds = [this._selectedEntity];

      if (mode === "10d" || mode === "20d" || mode === "30d") {
        const days = parseInt(mode) || 10;
        const statsStart = new Date(now - (days + 1) * 24 * 3600 * 1000).toISOString();
        const histDays = Math.min(days, 10);
        const histStart = new Date(now - (histDays + 1) * 24 * 3600 * 1000).toISOString();

        // 1. Fetch detailed history for same-time points (last 10 days max)
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

      } else if (mode === "week") {
        // Fetch 22 weeks of statistics to reliably display at least 20 weeks
        const statsStart = new Date(now - (22 * 7 * 24 * 3600 * 1000)).toISOString();
        const statsRes = await this._hass.callWS({
          type: "recorder/statistics_during_period",
          start_time: statsStart,
          statistic_ids: statsIds,
          period: "week"
        });
        this._history = [];
        this._stats = statsRes[this._selectedEntity] || [];

      } else if (mode === "month") {
        // Fetch daily statistics for last 380 days to display 12 full months
        const statsStart = new Date(now - (380 * 24 * 3600 * 1000)).toISOString();
        const statsRes = await this._hass.callWS({
          type: "recorder/statistics_during_period",
          start_time: statsStart,
          statistic_ids: statsIds,
          period: "day"
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
    const cur = this._hass.states[this._selectedEntity];
    const unit = cur ? (cur.attributes.unit_of_measurement || "°C") : "°C";

    const allPeriods = [
      { id: "10d", label: "📅 10 jours" },
      { id: "20d", label: "📅 20 jours" },
      { id: "30d", label: "📅 30 jours" },
      { id: "week", label: "🗓️ 20 semaines" },
      { id: "month", label: "🗓️ 12 mois" }
    ];
    const allowed = (Array.isArray(this.config.available_periods) && this.config.available_periods.length)
      ? this.config.available_periods
      : ["10d", "20d", "30d", "week", "month"];
    const visiblePeriods = allPeriods.filter(p => allowed.includes(p.id));

    let mode = this._selectedPeriod || this.config.default_period || "10d";
    if (!allowed.includes(mode)) {
      mode = visiblePeriods[0] ? visiblePeriods[0].id : "10d";
      this._selectedPeriod = mode;
    }

    const now = new Date();
    const nowTimeStr = now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

    let rowsList = [];
    let subtitleHtml = "";

    if (mode === "10d" || mode === "20d" || mode === "30d") {
      const daysCount = parseInt(mode) || 10;
      subtitleHtml = daysCount <= 10
        ? `<span class="legend-item"><span class="legend-dot today"></span> T° actuelle (${nowTimeStr})</span>
           <span class="legend-item"><span class="legend-dot past"></span> Même heure (${nowTimeStr}) les jours passés</span>`
        : `<span class="legend-item"><span class="legend-dot today"></span> T° actuelle (${nowTimeStr})</span>
           <span class="legend-item"><span class="legend-dot past"></span> Même heure (10 derniers jours)</span>
           <span class="legend-item" style="opacity:0.8;">Barres Min-Max sur ${daysCount} jours</span>`;

      // 1. Calculer les min/max exacts depuis l'historique direct (_history) pour les jours récents
      const histDaysMap = new Map();
      if (this._history && this._history.length) {
        for (const pt of this._history) {
          const val = parseFloat(pt.s);
          if (isNaN(val)) continue;
          const ptDate = new Date(pt.lu * 1000);
          const dStr = ptDate.toLocaleDateString("fr-FR", { year: "numeric", month: "2-digit", day: "2-digit" });
          if (!histDaysMap.has(dStr)) {
            histDaysMap.set(dStr, { min: val, max: val });
          } else {
            const h = histDaysMap.get(dStr);
            if (val < h.min) h.min = val;
            if (val > h.max) h.max = val;
          }
        }
      }

      // 2. Initialiser les N jours
      for (let i = 0; i < daysCount; i++) {
        const targetDate = new Date(now.getTime() - i * 24 * 3600 * 1000);
        const dateStr = targetDate.toLocaleDateString("fr-FR", { year: "numeric", month: "2-digit", day: "2-digit" });
        
        let label = "";
        if (i === 0) label = "Auj.";
        else if (i === 1) label = "Hier";
        else {
          const w = targetDate.toLocaleDateString("fr-FR", { weekday: "short" });
          const d = targetDate.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });
          label = `${w.charAt(0).toUpperCase() + w.slice(1)} ${d}`;
        }

        const isToday = i === 0;
        const currentVal = (isToday && cur && !isNaN(parseFloat(cur.state))) ? parseFloat(cur.state) : null;

        let sameTimeVal = currentVal;
        if (!isToday && i < 10 && this._history && this._history.length) {
          const targetTs = Math.floor(targetDate.getTime() / 1000);
          for (const pt of this._history) {
            if (pt.lu <= targetTs) {
              const v = parseFloat(pt.s);
              if (!isNaN(v)) sameTimeVal = v;
            } else {
              break;
            }
          }
        } else if (i >= 10) {
          sameTimeVal = null;
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

      // 3. Compléter avec les statistiques pour les jours antérieurs
      if (this._stats && this._stats.length) {
        for (const stat of this._stats) {
          const statDate = new Date(stat.start);
          const statDateStr = statDate.toLocaleDateString("fr-FR", { year: "numeric", month: "2-digit", day: "2-digit" });
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

    } else if (mode === "week") {
      subtitleHtml = `<span>Synthèse hebdomadaire des 20 dernières semaines (Numéros de semaine ISO)</span>`;
      if (this._stats && this._stats.length) {
        const sorted = [...this._stats].reverse().slice(0, 20);
        rowsList = sorted.map((stat, idx) => {
          const sDate = new Date(stat.start);
          const wNum = getISOWeekNumber(sDate);
          const label = idx === 0 ? `Sem. ${wNum} (Auj.)` : `Semaine ${wNum}`;
          return {
            label: label,
            min: stat.min,
            max: stat.max,
            sameTimeVal: null,
            isToday: idx === 0
          };
        });
      }

    } else if (mode === "month") {
      subtitleHtml = `<span>Synthèse mensuelle des 12 derniers mois (Évolution des saisons & amplitudes)</span>`;
      if (this._stats && this._stats.length) {
        const monthsMap = {};
        for (const stat of this._stats) {
          const dt = new Date(stat.start);
          const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`;
          let mName = dt.toLocaleDateString("fr-FR", { month: "short", year: "2-digit" });
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
        const sortedKeys = Object.keys(monthsMap).sort().reverse().slice(0, 12);
        rowsList = sortedKeys.map((k, idx) => ({
          label: monthsMap[k].label,
          min: monthsMap[k].min,
          max: monthsMap[k].max,
          sameTimeVal: null,
          isToday: idx === 0
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
            <span class="scale-legend-tag">Échelle</span>
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
          <div class="scale-spacer-right"></div>
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
          ? `T° actuelle : ${d.sameTimeVal.toFixed(1)}${unit}`
          : `T° à ${nowTimeStr} : ${d.sameTimeVal.toFixed(1)}${unit}`;
        dotHtml = `<div class="${dotClass}" style="left:${dotPct}%;" title="${dotTitle}"></div>`;
      }

      const todayClass = d.isToday ? "today" : "";

      return `
        <div class="row">
          <div class="day-label ${todayClass}">${d.label}</div>
          <div class="temp temp-min">${minVal}°</div>
          <div class="bar-track">
            ${trackGuidesHtml}
            <div class="bar-fill" style="left:${leftPct}%; width:${widthPct}%;"></div>
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
            ${visiblePeriods.map(p => `
              <option value="${p.id}" ${mode === p.id ? "selected" : ""}>${p.label}</option>
            `).join("")}
          </select>
        </div>
      </div>
    `;

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
          margin-bottom: 8px;
          user-select: none;
        }
        .scale-spacer-left {
          width: 148px;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: flex-end;
          padding-right: 12px;
          box-sizing: border-box;
        }
        .scale-legend-tag {
          font-size: 10px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: var(--secondary-text-color);
          opacity: 0.65;
        }
        .scale-spacer-right {
          width: 56px;
          flex-shrink: 0;
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
          gap: 12px;
        }
        .row {
          display: flex;
          align-items: center;
          font-size: 14px;
          line-height: 1;
        }
        .day-label {
          width: 92px;
          flex-shrink: 0;
          font-weight: 500;
          color: var(--primary-text-color);
          white-space: nowrap;
          font-variant-numeric: tabular-nums;
        }
        .day-label.today {
          color: var(--accent-color, #ff9800);
          font-weight: 700;
        }
        .temp {
          width: 44px;
          flex-shrink: 0;
          font-size: 13px;
          font-variant-numeric: tabular-nums;
        }
        .temp-min {
          text-align: right;
          color: var(--secondary-text-color, #9e9e9e);
          opacity: 0.85;
          margin-right: 12px;
        }
        .temp-max {
          text-align: left;
          color: var(--primary-text-color, #ffffff);
          font-weight: 600;
          margin-left: 12px;
        }
        .bar-track {
          flex: 1;
          height: 18px;
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
          min-width: 28px;
          background: linear-gradient(90deg, #43a047 0%, #81c784 25%, #fdd835 55%, #fb8c00 80%, #e53935 100%);
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
          width: 11px;
          height: 11px;
          background: #ffffff;
          border: 2px solid #1a1a1a;
          box-shadow: 0 0 4px rgba(0,0,0,0.85);
          z-index: 4;
        }
        .current-dot.past {
          width: 8px;
          height: 8px;
          background: #cfd8dc;
          border: 1.5px solid #263238;
          opacity: 0.95;
        }
      </style>
      <ha-card>
        <div class="header-row">
          <div class="card-header">${this.config.title || "Amplitudes Journalières"}</div>
          ${selectorHtml}
        </div>
        <div class="subtitle">
          ${subtitleHtml}
        </div>
        ${scaleHtml}
        <div class="rows-container">
          ${rowsHtml || '<div style="color:var(--secondary-text-color);font-size:13px;padding:8px 0;">Chargement des données historiques...</div>'}
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

customElements.define("temperature-range-card", TemperatureRangeCard);
window.customCards = window.customCards || [];
window.customCards.push({
  type: "temperature-range-card",
  name: "Temperature Range Card",
  description: "Barres d'amplitudes thermiques Min - Max style Apple Weather avec statistiques longues durées, échelle graduée et éditeur visuel",
  preview: true
});
