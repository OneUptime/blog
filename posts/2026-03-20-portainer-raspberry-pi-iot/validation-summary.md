# Validation Summary: How to Deploy IoT Applications on Raspberry Pi with Portainer - Part 3

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Portainer stacks
- Docker Compose
- Raspberry Pi
- Eclipse Mosquitto MQTT broker
- Node-RED
- node-red-contrib-influxdb
- InfluxDB OSS v2
- Grafana
- Docker device mappings for GPIO access

## Sources Consulted
- Portainer documentation: Add a new stack - https://docs.portainer.io/sts/user/docker/stacks/add
- Docker Compose version top-level element - https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Compose services reference (`devices`, `group_add`) - https://docs.docker.com/reference/compose-file/services/
- Docker run reference (`--group-add`) - https://docs.docker.com/engine/containers/run/
- Node-RED Docker documentation - https://nodered.org/docs/getting-started/docker
- Node-RED import/export documentation - https://nodered.org/docs/user-guide/editor/workspace/import-export
- Node-RED Flow Library: `node-red-contrib-influxdb` - https://flows.nodered.org/node/node-red-contrib-influxdb
- InfluxDB Docker Official Image - https://hub.docker.com/_/influxdb
- InfluxDB OSS v2 Docker Compose installation - https://docs.influxdata.com/influxdb/v2/install/use-docker-compose/
- InfluxDB OSS v2 token management - https://docs.influxdata.com/influxdb/v2/admin/tokens/
- Eclipse Mosquitto Docker Official Image - https://hub.docker.com/_/eclipse-mosquitto/
- Eclipse Mosquitto configuration manual - https://mosquitto.org/man/mosquitto-conf-5.html
- Eclipse Mosquitto password utility manual - https://mosquitto.org/man/mosquitto_passwd-1.html
- Portainer default HTTPS port documentation - https://docs.portainer.io/2.33-lts/faqs/installing/how-do-i-change-the-port-that-portainer-runs-on
- Grafana Docker installation documentation - https://grafana.com/docs/grafana/latest/setup-grafana/installation/docker/
- Grafana configuration reference - https://grafana.com/docs/grafana/latest/setup-grafana/configure-grafana/

## Issues Found
- The prerequisites implied any Raspberry Pi 4 would work, but the official InfluxDB image supports `arm64v8` rather than generic 32-bit Raspberry Pi environments. Updated the prerequisite to require a 64-bit OS.
- The Compose snippet used the top-level `version: "3.8"` field, which Docker now documents as obsolete. Removed it to match the current Compose Specification.
- The Mosquitto service exposed ports `8883` and `9001` as if TLS and WebSocket listeners were enabled, but the provided `mosquitto.conf` only configured `listener 1883`. Removed the unsupported port mappings.
- The Mosquitto instructions created the configuration after the container was already running, but did not restart the broker. Added a restart step so the new config is actually loaded.
- The Node-RED flow diagram was labeled as `javascript` even though it was not executable JavaScript. Changed the fence to `text`.
- The Node-RED section treated the InfluxDB output node as built-in and provided an invalid two-node JSON import example. Updated the text to require installing `node-red-contrib-influxdb` and replaced the invalid import snippet with accurate guidance about full flow exports and the required InfluxDB 2.x connection settings.

## Review Notes
- The service URLs and Mosquitto authentication commands are technically correct after the edits.
- `grafana/grafana:latest`, `nodered/node-red:latest`, and `eclipse-mosquitto:latest` are valid image references, but they are unpinned and may change behavior over time.
- `influxdb:2.7` is still a valid tag, but the official image documentation now lists `2.8.0` as the latest InfluxDB v2 tag and notes that InfluxDB 3 Core is the current major release for new deployments.
- Docker is not installed in this workspace, so I validated the post against official documentation rather than by deploying the stack locally.
