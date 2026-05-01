# Validation Summary: How to Deploy Node-RED for IoT Workflows via Portainer - Nodered

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Portainer
- Node-RED
- Docker Compose / Portainer stacks
- MQTT
- InfluxDB
- Nginx
- Node.js

## Sources Consulted
- Node-RED Docker documentation: https://nodered.org/docs/getting-started/docker
- Node-RED runtime configuration documentation: https://nodered.org/docs/user-guide/runtime/configuration
- Node-RED security documentation: https://nodered.org/docs/user-guide/runtime/securing-node-red
- Node-RED projects documentation: https://nodered.org/docs/user-guide/projects/
- Node-RED concepts documentation: https://nodered.org/docs/user-guide/concepts
- Node-RED Flow Library entry for `node-red-contrib-influxdb`: https://flows.nodered.org/node/node-red-contrib-influxdb
- Node-RED Flow Library entry for `node-red-dashboard`: https://flows.nodered.org/node/node-red-dashboard
- FlowFuse Dashboard documentation: https://dashboard.flowfuse.com/getting-started.html
- Portainer documentation on configs: https://docs.portainer.io/user/docker/configs
- Portainer documentation on relative path volumes: https://docs.portainer.io/advanced/relative-paths
- Portainer documentation on editing stacks: https://docs.portainer.io/2.21/user/docker/stacks/edit
- Eclipse Mosquitto 2.0 migration notes: https://mosquitto.org/documentation/migrating-to-2-0/
- Eclipse Mosquitto official Docker image documentation: https://hub.docker.com/_/eclipse-mosquitto/
- NGINX WebSocket proxying documentation: https://nginx.org/en/docs/http/websocket.html
- Node-RED homepage/version info: https://nodered.org/
- Node-RED Docker Hub tags: https://hub.docker.com/r/nodered/node-red/tags

## Issues Found
- The post pinned an outdated Node-RED image tag (`3.1.3-18`). I updated it to the current official Node-RED release tag (`4.1.8`) available on Docker Hub as of 2026-05-01.
- The custom Docker healthcheck used `curl`, while the official Node-RED image already includes its own healthcheck and the docs describe disabling it with `--no-healthcheck` if needed. I removed the custom healthcheck block.
- The post said to create `settings.js` with Portainer Configs. Portainer documents Configs as Docker Swarm-only, so that instruction was incorrect for Docker Standalone. I changed the text to editing the persisted `/data/settings.js` file instead.
- The `settings.js` example used `functionGlobalContext` to require `moment` without installing it and described it incorrectly as code coverage. I replaced it with a valid empty object and corrected the meaning.
- The `editorTheme.palette.allowInstall` setting was incorrect/deprecated for modern Node-RED. I moved package installation control to `externalModules.palette.allowInstall`.
- The password example used a placeholder string that was not a valid bcrypt hash. I replaced it with a valid example hash from the official Node-RED security docs and noted how to generate a new one.
- The install list attempted to install MQTT nodes even though MQTT nodes are part of Node-RED core. I removed that command.
- The post recommended `node-red-dashboard`, which the Node-RED Flow Library now marks as deprecated. I replaced it with `@flowfuse/node-red-dashboard`.
- The example flow JSON was not importable as written: it lacked a flow tab, wires, and the required MQTT and InfluxDB config nodes, and it mixed the `influxdb out` node with the payload format used by the `influxdb batch` node. I replaced it with a valid importable flow that matches the documented batch-node payload format.
- The alerting function assumed `msg.payload.device_id` existed after the earlier transformation. I updated it to derive the device identifier from the MQTT topic or payload so it works when branched from the parsed JSON message.
- The Nginx compose snippet mounted `./nginx.conf`, which Portainer only supports in limited Git-based Business Edition relative-path scenarios, and it referenced TLS certificates without mounting them. I changed the example to host paths, added the certificate mount, kept the stack on the same Docker network, and added an HTTP-to-HTTPS redirect block.

## Review Notes
- `node-red-contrib-influxdb` remains available in the Node-RED Flow Library, but its published documentation is older and mentions testing up to older Node.js LTS releases. The example is valid for the documented node behavior, but package compatibility should still be verified in your own environment.
- The post now assumes an existing MQTT broker and InfluxDB instance for the example flow. That keeps the Node-RED deployment guidance accurate without adding insecure or incomplete sidecar broker configuration.
