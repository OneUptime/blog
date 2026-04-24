# Validation Summary: How to Build a Self-Service Developer Portal with Portainer API

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Portainer API
- Docker Standalone stacks
- Node.js
- Express
- Axios
- JSON Web Tokens (JWT)
- HTML and Fetch API
- Docker Compose syntax

## Sources Consulted
- Portainer API documentation index: https://docs.portainer.io/api/docs
- Accessing the Portainer API: https://docs.portainer.io/api/access
- Portainer BE 2.39.1 OpenAPI spec: https://api-docs.portainer.io/versions/ee/2.39.1.yaml
- Portainer Docker roles and permissions: https://docs.portainer.io/advanced/docker-roles-and-permissions
- Node.js Docker Official Image overview: https://hub.docker.com/_/node/
- BusyBox command reference: https://busybox.net/downloads/BusyBox.html
- Express CORS middleware docs: https://expressjs.com/en/resources/middleware/cors.html
- Node.js `crypto.randomBytes()` docs: https://nodejs.org/api/crypto.html

## Issues Found
- The sample used `GET /stacks?endpointId=...`, but the current Portainer OpenAPI spec documents stack filtering via the `filters` query parameter instead. I updated the list and delete lookup code to call `/stacks` with `filters: {"EndpointID": ...}`.
- The article described the example as `Docker/K8s`, but the code uses Portainer's `/stacks/create/standalone/string` endpoint, which is specifically for Docker Standalone stacks. I updated the architecture diagram to match the implementation.
- The prerequisites required Portainer BE, but the demonstrated stack API is available in both CE and BE. I changed the prerequisite to `Portainer CE or BE`, while keeping the note that BE is needed for team and RBAC features.
- The `node:18-alpine` containers used `sleep infinity`, but Alpine-based images rely on BusyBox tooling, whose documented `sleep` usage accepts numeric durations rather than `infinity`. I replaced those commands with `["tail", "-f", "/dev/null"]`.
- The frontend calls `http://localhost:3001/api` as a separate browser origin, but the backend did not enable CORS. I added `cors` middleware so the sample GET/POST/DELETE requests work from the provided HTML page.
- Stack names were normalized on create but not on list and delete, which could make environments impossible to find or destroy for mixed-case or punctuation-heavy names. I added shared slug helpers and applied them consistently.
- The PostgreSQL password was generated with `Math.random()`, which is not appropriate for secrets. I changed it to `crypto.randomBytes()` as documented by Node.js for cryptographically strong random data.

## Review Notes
- The JWT verification snippet is a generic shared-secret example. If this portal is wired directly to Keycloak or Auth0, production code should validate issuer, audience, and signing keys/JWKS rather than relying on a local `JWT_SECRET`.
- The random host-port selection remains a demo approach. A production portal would usually allocate ports centrally or expose environments through an ingress or reverse proxy layer to avoid collisions.
