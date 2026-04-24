# Validation Summary: How to Deploy Home Assistant via Portainer - Homeassistant

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- Portainer
- Docker Compose / Docker stacks
- Home Assistant Container
- Home Assistant automations
- Zigbee2MQTT
- Eclipse Mosquitto (MQTT)

## Sources Consulted
- Home Assistant Container installation docs: https://www.home-assistant.io/installation/alternative/
- Home Assistant automation YAML docs: https://www.home-assistant.io/docs/automation/yaml/
- Home Assistant light action docs: https://www.home-assistant.io/actions/light.turn_on/
- Home Assistant backup integration docs: https://www.home-assistant.io/integrations/backup/
- Home Assistant installation-independent backup docs: https://www.home-assistant.io/common-tasks/general/
- Home Assistant container common tasks: https://www.home-assistant.io/common-tasks/container/
- Docker Compose `version` reference: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Compose services reference: https://docs.docker.com/reference/compose-file/services/
- Eclipse Mosquitto 2.x migration notes: https://mosquitto.org/documentation/migrating-to-2-0/
- Eclipse Mosquitto config reference: https://mosquitto.org/man/mosquitto-conf-5.html
- Eclipse Mosquitto official image docs: https://hub.docker.com/_/eclipse-mosquitto/
- Zigbee2MQTT Docker docs: https://www.zigbee2mqtt.io/guide/installation/02_docker.html

## Issues Found
- The main Compose example used the top-level `version` field. Current Docker Compose documentation marks this field as obsolete, so it was removed.
- The Home Assistant stack included a healthcheck that depended on a placeholder bearer token and a non-documented in-container `curl` check. This was removed because the example would not work as written.
- The `/etc/localtime` comment said it was required for time synchronization. That was inaccurate, so it was changed to describe host/container local time alignment instead.
- The automation example used older automation YAML keys (`trigger`, `condition`, `action`) plus the older `service:` form. It was updated to current Home Assistant syntax (`triggers`, `conditions`, `actions`, `action:`).
- The automation example used the deprecated `color_temp` field. Home Assistant removed deprecated mired/Kelvin light arguments from `light.turn_on`, so the example was updated to `color_temp_kelvin`.
- The automation example referenced `automation.yaml` and an outdated UI path. It was corrected to `automations.yaml` and `Settings > Automations & Scenes > Create automation`.
- The Zigbee2MQTT example used the old Docker image reference and host networking. It was updated to the current official `ghcr.io/koenkk/zigbee2mqtt:latest` image and a published frontend port, matching current Zigbee2MQTT Docker guidance more closely.
- The Zigbee2MQTT snippet referenced a named volume without declaring it. A `volumes` block was added so the snippet is complete.
- The Mosquitto example was incomplete for Mosquitto 2.x because it omitted the required listener configuration. A minimal `mosquitto.conf` example was added, and the Compose example was updated to mount config, data, and log paths.
- The backup section used `docker exec homeassistant ha backups new`, which does not match the current documented container backup workflow. It was replaced with the current UI-based backup flow plus the correct container backup path (`/backup`) for copying local backup files out.
- The UI backup path was outdated (`Create backup`). It was updated to `Settings > System > Backups > Backup now > Manual backup`.

## Review Notes
- The article is technically relevant and salvageable; it required targeted corrections rather than removal.
- The Home Assistant docs currently support backups across installation types, including container installs, so UI-based backup guidance is valid.
- The Mosquitto example now uses `allow_anonymous true` for a minimal working local setup. For production or any untrusted network, authenticated MQTT access would be preferable.
