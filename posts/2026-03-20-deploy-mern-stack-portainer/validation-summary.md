# Validation Summary: How to Deploy a MERN Stack via Portainer

## Status
validated

## Post Type
Tutorial / Deployment guide

## Technologies Covered
- Portainer (container management UI)
- Docker Compose (v3.8 schema)
- MongoDB 7 (`mongo:7` official image)
- Node.js 20 Alpine (`node:20-alpine`)
- Express.js (backend pattern, implied)
- React (Create React App conventions: `REACT_APP_*` env vars, `npm start`, `/build` output)
- Nginx (`nginx:alpine`) as the production static-file server and reverse proxy
- JWT (env var only, no implementation shown)

## Sources Consulted
- Docker Compose file reference: https://docs.docker.com/reference/compose-file/
- MongoDB Docker image documentation: https://hub.docker.com/_/mongo (root-user env vars and authentication; `authSource=admin` for the root user created in the `admin` DB)
- Node.js official Docker image: https://hub.docker.com/_/node
- Nginx official Docker image: https://hub.docker.com/_/nginx
- Nginx `proxy_pass` URI semantics (when `proxy_pass` has no trailing path, the matched URI is appended): https://nginx.org/en/docs/http/ngx_http_proxy_module.html#proxy_pass
- Create React App environment variables (build-time inlining of `REACT_APP_*`): https://create-react-app.dev/docs/adding-custom-environment-variables/
- Portainer stacks (Compose) documentation: https://docs.portainer.io/user/docker/stacks

## Issues Found
1. **Browser-unreachable backend URL in the dev Compose `REACT_APP_API_URL`.**
   The dev `frontend` service set `REACT_APP_API_URL: http://backend:5000/api`. `REACT_APP_*` values are inlined into the JavaScript bundle and consumed by the browser, which cannot resolve the Docker-internal service name `backend` — only containers on the same Compose network can. Since the backend already publishes port `5000` on the host, the browser-reachable URL is `http://localhost:5000/api`. Updated the value and adjusted the inline comment accordingly. The production Nginx setup is unaffected because `proxy_pass http://backend:5000;` runs server-side inside the Compose network, where the `backend` hostname resolves correctly.

## Review Notes
- **Compose `version: "3.8"`** is now treated as obsolete by current Docker Compose (the top-level `version` field is ignored and emits a warning). The stack still works as written, so no change was made, but the field could be dropped in a future revision.
- **Create React App is deprecated** as of February 2025; the React team now recommends Vite, Next.js, Remix, etc. The `REACT_APP_*` / `npm start` / `npm run build` patterns shown remain valid for existing CRA projects, so no change was made.
- **Nginx `proxy_pass` semantics** are correct as written: with `location /api { proxy_pass http://backend:5000; }` (no trailing path on the upstream), the `/api` prefix is preserved and forwarded — so the backend must serve routes at `/api/...`, which is consistent with the `/api/health` monitoring URL in the post.
- **MongoDB connection string** uses `authSource=admin`, which is correct given the root user is created in the `admin` database via `MONGO_INITDB_ROOT_USERNAME` / `MONGO_INITDB_ROOT_PASSWORD`.
- **Dev volume + `npm install` pattern**: mounting `./frontend:/app` and running `npm install` on every container start is functional but can collide with host-installed `node_modules` when host and container OS/arch differ. Common mitigation is an anonymous volume on `/app/node_modules`. Not a correctness bug, so left untouched.
- **Health endpoint**: the Monitoring section references `/api/health` but the post does not show an Express handler for it; readers will need to implement this route in their backend.
