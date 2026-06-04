# Validation Summary: How to Run Home Assistant in Docker

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Home Assistant Container
- Docker and Docker Compose
- Zigbee Home Automation (ZHA)
- Z-Wave JS
- MQTT and Eclipse Mosquitto
- Zigbee2MQTT
- Home Assistant automations and dashboards

## Sources Consulted
- Home Assistant Container installation documentation: https://www.home-assistant.io/installation/linux/
- Home Assistant automation trigger documentation: https://www.home-assistant.io/docs/automation/trigger/
- Home Assistant automation action documentation: https://www.home-assistant.io/docs/automation/action/
- Home Assistant light action documentation: https://www.home-assistant.io/actions/light.turn_on/
- Home Assistant Companion App notification documentation: https://companion.home-assistant.io/docs/notifications/notifications-basic/
- Home Assistant ZHA integration documentation: https://www.home-assistant.io/integrations/zha/
- Home Assistant Z-Wave documentation: https://www.home-assistant.io/docs/z-wave/
- Home Assistant dashboard cards documentation: https://www.home-assistant.io/dashboards/cards/
- Docker Compose file reference: https://docs.docker.com/reference/compose-file/
- Docker Compose version and name reference: https://docs.docker.com/reference/compose-file/version-and-name/
- Eclipse Mosquitto Docker Official Image documentation: https://hub.docker.com/_/eclipse-mosquitto/
- Eclipse Mosquitto 2.0 migration documentation: https://mosquitto.org/documentation/migrating-to-2-0/

## Issues Found
- The main Docker Compose example used the obsolete top-level `version: "3.8"` field. Removed it because current Docker Compose uses the Compose Specification and treats `version` as obsolete.
- The post implied that a Z-Wave USB stick can be passed directly to the Home Assistant Container in the same way as a Zigbee stick. Updated the wording to clarify that Z-Wave requires a separate Z-Wave JS server, such as Z-Wave JS UI in Docker, for Home Assistant Container setups.
- The automation examples used older `trigger` / `action` and `service` style YAML. Updated them to current `triggers`, `conditions`, `actions`, and `action` syntax used in current Home Assistant documentation.
- The light automation used deprecated `color_temp` in mireds. Replaced it with `color_temp_kelvin: 2700`, matching current Home Assistant light action documentation.
- The mobile notification example used `notify.mobile_app`, which is not the service action name created by the Companion App. Changed it to the placeholder `notify.mobile_app_your_phone` to reflect the documented device-specific action naming pattern.
- The Mosquitto Docker example mounted configuration and data directories but omitted the log directory and did not note that Mosquitto 2.x needs listener and authentication configuration for non-local clients. Added the log mount and a brief configuration note.

## Review Notes
- The Docker Compose snippets were validated with `docker compose -f - config` using the installed Docker Compose CLI.
- The article remains a high-level Home Assistant Container guide. The Mosquitto and Zigbee2MQTT snippets still assume users will provide the service-specific configuration files referenced by those containers.
