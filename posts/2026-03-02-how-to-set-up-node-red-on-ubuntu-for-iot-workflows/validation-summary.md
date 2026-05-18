# Validation Summary: How to Set Up Node-RED on Ubuntu for IoT Workflows

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Node-RED
- Node.js (via NodeSource and nvm)
- systemd
- Mosquitto (MQTT broker)
- bcrypt password hashing (via `node-red admin hash-pw`)
- Node-RED Dashboard
- InfluxDB / SQLite / Home Assistant integration nodes
- MQTT protocol

## Sources Consulted
- Node-RED official docs — Securing Node-RED: https://nodered.org/docs/user-guide/runtime/securing-node-red
- Node-RED official docs — Command line: https://nodered.org/docs/getting-started/local
- Node-RED settings reference: https://nodered.org/docs/user-guide/runtime/configuration
- npm — node-red-contrib-aedes: https://www.npmjs.com/package/node-red-contrib-aedes
- npm — node-red-contrib-mqtt-broker (deprecated): https://www.npmjs.com/package/node-red-contrib-mqtt-broker
- npm — node-red-contrib-home-assistant-websocket: https://www.npmjs.com/package/node-red-contrib-home-assistant-websocket
- npm — node-red-contrib-http-request (stale): https://www.npmjs.com/package/node-red-contrib-http-request
- NodeSource setup script docs: https://github.com/nodesource/distributions
- Mosquitto config reference: https://mosquitto.org/man/mosquitto-conf-5.html
- ShellCheck SC1143 (inline comments break line continuation)

## Issues Found
1. **Incorrect password-hash command** — The post used `node-red-admin hash-pw`, which depends on the separately-installed `node-red-admin` package. Current Node-RED docs recommend the built-in subcommand `node-red admin hash-pw`. Updated both the command block and the inline comment in `settings.js`.
2. **Broken shell line continuation** — The `npm install` block used inline `# comment` annotations after `\` line-continuation characters separated by spaces. Per bash rules (and ShellCheck SC1143), `\` followed by whitespace then `#` does not continue the line — only the first package would have been installed. Rewrote the block: package descriptions moved into a header comment, and the `\` continuations placed at true end-of-line.
3. **Deprecated MQTT broker package** — Replaced `node-red-contrib-mqtt-broker` (deprecated, ~4 years stale, based on the unmaintained Mosca library) with `node-red-contrib-aedes`, the actively maintained successor.
4. **Stale/unnecessary HTTP request package** — Removed `node-red-contrib-http-request`. The HTTP Request node ships in Node-RED core; the contrib package on npm is ~6 years old. Added a note explaining the core node is sufficient.
5. **Outdated Home Assistant node** — Replaced `node-red-contrib-home-assistant` with `node-red-contrib-home-assistant-websocket` (by zachowj), the actively maintained, community-recommended integration.

## Review Notes
- The systemd unit, `--userDir` flag (capital D), `httpNodeAuth`, `adminAuth`, and `${ENV_VAR}` syntax are all correct per official Node-RED documentation.
- The Mosquitto `listener 1883 localhost` syntax is valid.
- The NodeSource `setup_20.x` URL is correct, though NodeSource has migrated to a newer `nsolid_setup_deb.sh` flow for some distros — the legacy `setup_20.x` script still works on Ubuntu 20.04/22.04.
- The nvm pin to `v0.39.7` is reachable; nvm has since released v0.40.x, but v0.39.7 still installs Node 20 without issue.
- `node-red-contrib-influxdb` covers both InfluxDB 1.x and 2.x; the post's mention is generic enough not to need version-specific guidance.
