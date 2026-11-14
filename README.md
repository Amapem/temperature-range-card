# Temperature Range Card for Home Assistant

A sleek, modern Lovelace card designed to visualize daily, weekly, and monthly temperature amplitudes from your Home Assistant sensors.

---

## Key Features

* **Real Sensor Amplitudes**: Designed for physical indoor and outdoor temperature sensors (`sensor.*`), not just weather forecasts.
* **Long-Term Statistics Support**: Leverages Home Assistant's native recorder and long-term statistics engine (`statistics_during_period`) across multiple granularities:
  * 📅 **10 Days**: Daily min/max amplitude with real-time current temperature marker and same-time comparison points from past days.
  * 📅 **20 Days & 30 Days**: Extended multi-day analysis.
  * 🗓️ **20 Weeks**: Weekly summaries grouped with ISO week numbers.
  * 🗓️ **12 Months**: Annual seasonal overview.
* **Graduated Temperature Scale**: Top-aligned visual scale showing global min, intermediate reference markers, and global max, with vertical guidelines embedded in each row's track.
* **Interactive Dynamic Selectors**: Switch between sensors and change observation periods directly from the card with automatic local storage persistence.
* **Visual Card Editor**: Complete configuration UI to reorder, add, or remove sensors, adjust default views, and toggle display options without writing YAML.

---

## Installation

### Via HACS (Custom Repository)

1. Open **HACS** in your Home Assistant dashboard.
2. Click the top-right menu (three dots) and select **Custom repositories**.
3. Enter the repository URL: `https://github.com/Amapem/temperature-range-card`.
4. Select category: **Dashboard** (or **Lovelace**).
5. Click **Add**, find **Temperature Range Card** in the list, and click **Download**.
6. Refresh your browser cache.

### Manual Installation

1. Download `temperature-range-card.js` from the latest release.
2. Place the file inside your Home Assistant config directory at `/config/www/temperature-range-card.js`.
3. Add a Lovelace resource in Home Assistant (**Settings** > **Dashboards** > **Three dots** > **Resources**):
   * URL: `/local/temperature-range-card.js`
   * Resource type: `JavaScript Module`

---

## Dashboard Configuration

### Visual Editor

Add a new card to your dashboard, search for **Temperature Range Card**, and configure your entities and preferences directly from the visual interface.

### YAML Example

```yaml
type: custom:temperature-range-card
title: Temperature Overview
default_period: 10d
default_entity: sensor.outdoor_temperature
show_scale: true
available_periods:
  - 10d
  - 20d
  - 30d
  - week
  - month
entities:
  - entity: sensor.outdoor_temperature
    name: Outdoor Sensor
  - entity: sensor.living_room_temperature
    name: Living Room
  - entity: sensor.bedroom_temperature
    name: Bedroom
```

---

## Configuration Options

| Parameter | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `type` | string | **Required** | `custom:temperature-range-card` |
| `entities` | list | **Required** | List of sensor objects (`entity` and `name`) |
| `title` | string | `Amplitudes & Comparatif Journalier` | Header title of the card |
| `default_entity` | string | First entity in list | Entity selected when the card is first loaded |
| `default_period` | string | `10d` | Initial period view (`10d`, `20d`, `30d`, `week`, `month`) |
| `show_scale` | boolean | `true` | Displays the graduated min/intermediate/max temperature scale |
| `available_periods` | list | `[10d, 20d, 30d, week, month]` | Allowed period options available in the card dropdown |

---

## Author & License

Created by **Amapem**. Released under the MIT open-source license.
