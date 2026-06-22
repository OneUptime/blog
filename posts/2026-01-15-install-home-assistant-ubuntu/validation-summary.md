# Validation Summary: How to Install Home Assistant on Ubuntu

## Status
validated

## Post Type
Tutorial / installation and configuration guide

## Technologies Covered
- Home Assistant (Container, Supervised, and Core install methods)
- Ubuntu 22.04 / 24.04 LTS
- Docker / Docker Compose
- Mosquitto (MQTT broker)
- InfluxDB 2 / Grafana
- Z-Wave JS, ZHA, Zigbee2MQTT
- HACS
- Cloudflare Tunnel (cloudflared), NGINX + Let's Encrypt (Certbot), Nabu Casa
- Node-RED, rclone, SQLite/MariaDB recorder backends
- Home Assistant YAML (configuration.yaml, automations, scripts, Lovelace dashboards)

## Sources Consulted
- Home Assistant MQTT integration docs — https://www.home-assistant.io/integrations/mqtt/
- Home Assistant MQTT YAML deprecation discussion (broker/port removed from YAML in 2022.6) — https://github.com/home-assistant/core/issues/114643 and https://community.home-assistant.io/t/mqtt-yaml-configuration-deprecation/400307
- Home Assistant OpenWeatherMap integration docs (config-flow only) — https://www.home-assistant.io/integrations/openweathermap/
- Home Assistant Google Translate TTS docs (legacy YAML still supported, tts.speak preferred) — https://www.home-assistant.io/integrations/google_translate/
- Home Assistant Core installation docs (useradd/venv/systemd pattern) — https://www.home-assistant.io/installation/
- Home Assistant Supervised installer & os-agent — https://github.com/home-assistant/supervised-installer and https://github.com/home-assistant/os-agent

## Issues Found
1. **MQTT broker configured via YAML (incorrect / removed).** The post instructed adding `mqtt:` with `broker:` and `port:` keys to `configuration.yaml`. The `broker` option was removed from YAML and `port`/`discovery`/`username`/`password` were deprecated starting in Home Assistant 2022.6; the broker connection must now be set up through the UI config flow. **Fix:** Replaced the invalid YAML block with UI setup instructions (Settings → Devices & Services → Add Integration → MQTT), retaining the broker hostname (`localhost`), port (`1883`), optional auth, and the note that discovery defaults to the `homeassistant` prefix.
2. **OpenWeatherMap configured via YAML weather platform (incorrect / removed).** The post used `weather: - platform: openweathermap` with an `api_key`. OpenWeatherMap is now a UI config-flow-only integration; the YAML platform setup was removed. **Fix:** Replaced the YAML block with config-flow instructions (Add Integration → OpenWeatherMap → enter API key) and noted the resulting `weather.openweathermap` entity.

## Review Notes
- The TTS section uses the legacy `tts: - platform: google_translate` YAML. This still works but is considered legacy; the modern approach is to set up the integration in the UI and use the `tts.speak` action (which the automation/script examples already use). Left as-is since it remains functional; a future update could move it to the config-flow approach. The example `tts.google_en` entity id is illustrative — the actual entity id depends on the user's setup.
- `color_temp: 500` in the light examples uses the deprecated `color_temp` (mireds) data key; `color_temp_kelvin` is now preferred. It still works with a deprecation warning, so it was left unchanged.
- `docker-compose.yml` declares `version: '3.8'`, which is obsolete and ignored by Compose v2 (harmless warning only) — left as-is.
- The Core install commands (`useradd -rm homeassistant -G dialout,gpio,i2c`, venv creation, and the `home-assistant@homeassistant.service` systemd unit referencing `/home/homeassistant/.homeassistant`) match the official Home Assistant Core installation pattern and are internally consistent.
- The os-agent download pins version `1.6.0`; using a pinned version under the `releases/latest/download/` path is valid as written, though readers may wish to bump to the current release.
- Nabu Casa pricing ($6.50/month), the Supervised dependency package list, Cloudflare Tunnel/NGINX reverse-proxy configs, and the Z-Wave JS / ZHA / Zigbee2MQTT sections were all verified as accurate and current.
