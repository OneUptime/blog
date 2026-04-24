# Validation Summary: How to Deploy Node-RED via Portainer - Nodered

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- Portainer
- Docker
- Docker Compose
- Node-RED
- MQTT
- InfluxDB
- Home Assistant
- Slack incoming webhooks

## Sources Consulted
- Node-RED Docker docs: https://nodered.org/docs/getting-started/docker
- Node-RED Docker healthcheck implementation: https://raw.githubusercontent.com/node-red/node-red-docker/master/docker-custom/healthcheck.js
- Node-RED security docs: https://nodered.org/docs/user-guide/runtime/securing-node-red
- Node-RED settings and runtime configuration docs: https://nodered.org/docs/user-guide/runtime/settings-file and https://nodered.org/docs/user-guide/runtime/configuration
- Node-RED palette and node installation docs: https://nodered.org/docs/user-guide/runtime/adding-nodes and https://nodered.org/docs/user-guide/editor/palette/manager
- Node-RED concepts and MQTT cookbook examples: https://nodered.org/docs/user-guide/concepts and https://cookbook.nodered.org/mqtt/receive-json
- `node-red-contrib-influxdb` package docs and examples: https://flows.nodered.org/node/node-red-contrib-influxdb
- `node-red-contrib-home-assistant-websocket` getting started guide: https://zachowj.github.io/node-red-contrib-home-assistant-websocket/guide/
- Docker Compose services, networking, volumes, version, and `docker exec` docs: https://docs.docker.com/reference/compose-file/services/ ; https://docs.docker.com/compose/how-tos/networking/ ; https://docs.docker.com/reference/compose-file/volumes/ ; https://docs.docker.com/reference/compose-file/version-and-name/ ; https://docs.docker.com/reference/cli/docker/container/exec
- `node-red-dashboard` deprecation notice: https://github.com/node-red/node-red-dashboard

## Issues Found
- The stack used a custom healthcheck against `/health`, but the official Node-RED image already ships a healthcheck and it checks the local HTTP service rather than a `/health` route. I removed the custom healthcheck block to avoid false unhealthy status.
- The compose comment incorrectly described `NODE_RED_ENABLE_PROJECTS` as a way to disable the editor. I corrected the comment to match the actual Projects feature.
- The authentication section used the older `bcryptjs` fallback command. I updated it to `docker exec -it nodered npx node-red admin hash-pw`, which matches current Node-RED guidance, and added the restart step required after editing `settings.js`.
- The package list included `node-red-contrib-mqtt`, even though MQTT support is built into core Node-RED nodes, and `node-red-node-postgresql`, which is not the correct PostgreSQL module name. I replaced these with the built-in MQTT nodes and `node-red-contrib-postgresql`.
- The post recommended `node-red-dashboard` without noting that it is deprecated. I marked it as deprecated and changed the CLI install example to a current package.
- The MQTT-to-InfluxDB example was not a working Node-RED flow export because it lacked a tab, wires, and the required MQTT and InfluxDB configuration nodes. I replaced it with a complete importable example.
- The "HTTP Webhook to Slack" pipeline diagram was fenced as JavaScript even though it was plain text, and the function snippet mixed request-node configuration into the function code. I changed the diagram block to text and simplified the function snippet to the payload and headers it should prepare.
- The Home Assistant example combined `network_mode: host` with `ports`, which Docker documents as a runtime error. I removed the port mapping, added the missing named volume declaration, and clarified that host networking is only needed in specific setups.

## Review Notes
- The post is technically relevant and salvageable after correction.
- The top-level Compose `version` field is still accepted for backward compatibility, but Docker now treats it as obsolete and warns about it in newer Compose environments.
- The examples still use `nodered/node-red:latest`, which is valid, but pinning a specific tag would improve reproducibility.
- `node-red-dashboard` still installs, but it is deprecated and should not be the default recommendation for new deployments.
