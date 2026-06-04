# Validation Summary: How to Run Node-RED in Docker for IoT Automation

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Node-RED
- Docker
- Docker Compose
- Eclipse Mosquitto
- MQTT
- JavaScript function nodes
- npm packages for Node-RED
- FlowFuse Dashboard

## Sources Consulted
- Node-RED Docker documentation: https://nodered.org/docs/getting-started/docker
- Node-RED function node documentation: https://nodered.org/docs/user-guide/writing-functions
- Node-RED adding nodes documentation: https://nodered.org/docs/user-guide/runtime/adding-nodes
- Node-RED securing documentation: https://nodered.org/docs/user-guide/runtime/securing-node-red
- Node-RED HTTP cookbook example format: https://cookbook.nodered.org/http/parse-json-response
- Node-RED `node-red-dashboard` package page: https://flows.nodered.org/node/node-red-dashboard
- FlowFuse Dashboard documentation: https://dashboard.flowfuse.com/getting-started.html
- Docker Compose version element documentation: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Compose networking documentation: https://docs.docker.com/reference/compose-file/networks/
- Eclipse Mosquitto Docker image documentation: https://hub.docker.com/_/eclipse-mosquitto/
- Eclipse Mosquitto 2.0 release notes: https://projects.eclipse.org/projects/iot.mosquitto/releases/2.0

## Issues Found
- Removed the obsolete top-level `version: "3.8"` key from the Docker Compose example because current Docker Compose treats it as backward-compatible metadata and warns that it is obsolete.
- Corrected the MQTT broker address for the Docker Compose setup from `localhost:1883` to `mosquitto:1883`, because services on the default Compose network reach each other by service name. Kept `localhost:1883` only for the case where the broker runs in the same Node-RED process environment.
- Added the missing instruction to set the Node-RED function node to two outputs. The sample returns an array for two outputs, which only works as described when the function node has two outputs configured.
- Replaced the incomplete Node-RED flow export with an importable flow that includes a tab, inject trigger, node positions, wires, a timestamp function, and debug output. The original JSON listed disconnected nodes and referenced a `timestamp` value that was never created.
- Updated command-line node installation commands to run `npm install` from `/data`, the Node-RED user directory in the Docker container, matching Node-RED's documented npm installation workflow.
- Replaced the deprecated `node-red-dashboard` package with `@flowfuse/node-red-dashboard` and updated the dashboard URL to `/dashboard`.
- Updated the password hash command from the older `node-red-admin` pattern to the current `node-red admin hash-pw` command documented for Node-RED 1.1.0 and later.

## Review Notes
The Mosquitto example intentionally allows anonymous connections for a simple local tutorial and labels that as something to change for production. The post could later add TLS, broker credentials, and Node-RED HTTP node authentication for a more production-focused guide, but those omissions are not technical inaccuracies in this introductory context.
