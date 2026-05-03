# Validation Summary: How to Deploy IoT Applications on Raspberry Pi with Portainer

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Docker (get-docker.sh convenience script)
- Portainer CE (community edition)
- Raspberry Pi / ARM
- Node-RED
- Eclipse Mosquitto (MQTT broker)
- Home Assistant (Container)
- Docker Compose

## Sources Consulted
- Docker official install convenience script: https://get.docker.com
- Portainer CE installation docs: https://docs.portainer.io/start/install-ce/server/docker/linux
- Portainer Docker Hub (multi-arch): https://hub.docker.com/r/portainer/portainer-ce
- Node-RED Docker docs: https://nodered.org/docs/getting-started/docker
- Node-RED Docker Hub (multi-arch including ARM): https://hub.docker.com/r/nodered/node-red
- Eclipse Mosquitto Docker Hub: https://hub.docker.com/_/eclipse-mosquitto
- Home Assistant Container install docs: https://www.home-assistant.io/installation/raspberrypi#install-home-assistant-container
- Home Assistant GHCR image: ghcr.io/home-assistant/home-assistant
- Docker Compose file format reference: https://docs.docker.com/compose/compose-file/

## Issues Found
No technical issues found.

All code examples are syntactically correct and will work as described:
- The `get-docker.sh` script supports ARM/Raspberry Pi OS.
- `portainer/portainer-ce:latest` is a multi-arch image with arm64/armv7 variants.
- Port 9000 (HTTP) is still supported by Portainer CE 2.x (alongside 9443 for HTTPS).
- `nodered/node-red:latest`, `eclipse-mosquitto:latest`, and `ghcr.io/home-assistant/home-assistant:stable` are the correct, current image references with ARM support.
- Home Assistant's `privileged: true` and `network_mode: host` settings match the official Container install recommendations for full device discovery functionality.
- Volume mount paths inside each container (`/data` for Node-RED, `/mosquitto/{config,data,log}` for Mosquitto, `/config` for Home Assistant) are accurate.

## Review Notes
- The default `pi` user in `sudo usermod -aG docker pi` exists on legacy Raspberry Pi OS images but newer Bookworm-based images require the user to create their own username during first-boot setup. Readers using a recent Pi OS install should substitute their actual username.
- Eclipse Mosquitto 2.0 changed default behavior: without an explicit `mosquitto.conf` providing `listener` and `allow_anonymous` settings, the broker only accepts connections from localhost. The compose file mounts a config volume but does not include a config file — readers will need to add a `mosquitto.conf` for remote MQTT clients (and to enable the WebSocket listener on port 9001).
- The `version: "3.8"` field in compose files is now considered obsolete by Docker Compose v2 and emits a warning, but it remains functional and harmless.
- The Portainer `docker run` command uses extra whitespace between flags; this is cosmetically unusual but parses correctly.
