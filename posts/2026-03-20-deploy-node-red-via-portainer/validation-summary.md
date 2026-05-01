# Validation Summary: How to Deploy Node-RED via Portainer

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Portainer
- Node-RED
- Docker
- Docker Compose / Stack files
- FlowFuse Dashboard

## Sources Consulted
- Node-RED Docker documentation: https://nodered.org/docs/getting-started/docker
- Node-RED security documentation: https://nodered.org/docs/user-guide/runtime/securing-node-red
- Node-RED official site overview: https://nodered.org/
- Node-RED Docker repository README: https://github.com/node-red/node-red-docker
- Portainer stack deployment documentation: https://docs.portainer.io/user/docker/stacks/add
- FlowFuse Dashboard getting started documentation: https://dashboard.flowfuse.com/getting-started.html

## Issues Found
- The compose example hard-coded `NODE_RED_CREDENTIAL_SECRET` while the deployment steps told the reader to set it in Portainer. I changed the compose file to use `${NODE_RED_CREDENTIAL_SECRET}` and clarified that the value should be set in Portainer's environment variable section.
- The post listed `At least 256MB RAM` as a hard prerequisite, but Node-RED's current official documentation does not state that minimum. I removed the unsupported requirement.
- The post implied that setting `NODE_RED_CREDENTIAL_SECRET` in the container environment was enough on its own. Node-RED's official Docker guidance requires `credentialSecret` to be set in `/data/settings.js`, so I added `credentialSecret: process.env.NODE_RED_CREDENTIAL_SECRET` to the `settings.js` example.
- The password hash example used an older `bcryptjs` one-liner. I updated it to the current official Node-RED command, `npx node-red admin hash-pw`, which matches the documented Docker workflow.
- The extra-node installation example ran `npm install` without changing to the Node-RED user directory. I updated it to run from `/data`, which is the documented location for installing additional nodes in the Docker image.

## Review Notes
- No remaining technical inaccuracies were found after the fixes above.
- The post uses `nodered/node-red:latest`, which is valid but less reproducible than pinning a specific image tag.
