# Validation Summary: How to Deploy Node-RED for IoT Workflows via Portainer

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Node-RED
- Portainer
- Docker Compose / Portainer stacks
- MQTT
- InfluxDB
- PostgreSQL
- Git-backed Node-RED Projects

## Sources Consulted
- Node-RED Docker documentation: https://nodered.org/docs/getting-started/docker
- Node-RED security documentation: https://nodered.org/docs/user-guide/runtime/securing-node-red
- Node-RED import/export documentation: https://nodered.org/docs/user-guide/editor/workspace/import-export
- Node-RED flow configuration types: https://nodered.org/docs/api/admin/types
- Node-RED Projects documentation: https://nodered.org/docs/user-guide/projects/
- Official Node-RED Docker repository: https://github.com/node-red/node-red-docker
- Official Node-RED Docker entrypoint script: https://raw.githubusercontent.com/node-red/node-red-docker/master/docker-custom/scripts/entrypoint.sh
- Official Node-RED Docker package metadata: https://raw.githubusercontent.com/node-red/node-red-docker/master/package.json
- Portainer stack deployment docs: https://docs.portainer.io/user/docker/stacks/add
- Portainer volume browsing docs: https://docs.portainer.io/user/docker/volumes/browse
- Portainer backup scope docs: https://docs.portainer.io/faqs/getting-started/what-does-portainers-backup-include
- Node-RED Flow Library entry for `node-red-contrib-mqtt-broker`: https://flows.nodered.org/node/node-red-contrib-mqtt-broker
- Node-RED Flow Library entry for `node-red-contrib-aedes`: https://flows.nodered.org/node/node-red-contrib-aedes
- Node-RED Flow Library entry for `node-red-dashboard`: https://flows.nodered.org/node/node-red-dashboard
- Node-RED Flow Library entry for `@flowfuse/node-red-dashboard`: https://flows.nodered.org/node/%40flowfuse/node-red-dashboard
- Node-RED Flow Library entry for `node-red-contrib-influxdb`: https://flows.nodered.org/node/node-red-contrib-influxdb
- Node-RED Flow Library entry for `node-red-contrib-postgresql`: https://flows.nodered.org/node/node-red-contrib-postgresql

## Issues Found
- The post pinned `nodered/node-red:3.1.3`, which is outdated relative to the current official Node-RED Docker image. I updated it to `nodered/node-red:4.1.8`.
- The post recommended `node-red-contrib-mqtt-broker`, which the Node-RED Flow Library marks as no longer maintained because it depends on the unmaintained Mosca broker. I replaced it with `node-red-contrib-aedes`.
- The post recommended `node-red-dashboard`, which the Node-RED Flow Library marks as deprecated. I replaced it with `@flowfuse/node-red-dashboard`.
- The post claimed that mounting `/data/package.json` would cause Node-RED to install packages on startup. The official Node-RED Docker entrypoint only starts Node-RED with `--userDir /data`; it does not perform that install step. I changed this to the supported custom-image build pattern using `package.json` plus a Dockerfile.
- The sample flow JSON was not a complete importable flow because it omitted the tab node and required MQTT/InfluxDB config nodes, and it did not match the documented Node-RED export structure. I replaced it with a complete importable flow example.
- The password hash example used the older manual bcrypt expression. For current Node-RED releases, the official docs recommend `node-red admin hash-pw`, so I updated the command.
- The backup section implied Portainer has a volume backup feature for application data and only mentioned `flows.json`. Portainer's own backup does not include volumes, and Node-RED also stores encrypted credentials in `flows_cred.json`. I corrected the backup guidance accordingly.
- The backup section referenced `node-red-contrib-git`, but current official Node-RED documentation points to the built-in Projects feature for Git-backed flow storage. I updated that guidance.

## Review Notes
- The Docker image tag and package versions in the post are accurate as of 2026-05-01 and may need periodic refreshes.
- Portainer volume browsing is only available when the environment supports it, such as Docker Swarm or when using the Portainer Agent.
- The `adminAuth` example secures the editor and admin API. If the deployment also exposes HTTP In nodes or dashboards, separate HTTP endpoint auth settings may still be needed.
