# Validation Summary: How to View Container Details and Inspect JSON in Portainer - View Details Json

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Portainer (web UI and HTTP API)
- Docker Engine API (proxied via Portainer)
- Docker CLI (`docker inspect`, `docker run`)
- Bash / curl
- Python 3 (for JSON parsing in shell pipelines)

## Sources Consulted
- Portainer API documentation: https://docs.portainer.io/api/docs
- Portainer authentication endpoint reference (`POST /api/auth` returning `jwt`)
- Docker Engine API reference (v1.43+): https://docs.docker.com/engine/api/v1.43/
  - Container lifecycle endpoints: `/containers/{id}/start|stop|restart|kill|pause|unpause`
  - `DELETE /containers/{id}` with `force` query parameter
  - `GET /containers/{id}/json` for inspect
  - `GET /containers/json?all=1` for listing
- Docker CLI reference for `docker inspect --format` and Go template syntax (`{{json .Config}}`)

## Issues Found
No technical issues found.

- Portainer's default HTTPS port `9443` is correct.
- The `/api/auth` endpoint returns a JSON object with the `jwt` key — correctly parsed.
- The Portainer Docker API proxy paths `/api/endpoints/{id}/docker/containers/...` are valid and map directly to Docker Engine API endpoints.
- The `DELETE` with `?force=true` query parameter correctly mirrors `docker rm --force`.
- Docker container `Names` are returned with a leading slash (e.g., `/my-container`) — the Python filter correctly accounts for this.
- The `docker inspect --format '{{json .Config}}'` Go template is valid syntax.

## Review Notes
- The post title focuses on "View Container Details and Inspect JSON" but the body primarily covers container lifecycle operations (start/stop/restart/kill/pause/unpause/remove). Only the last curl command in the API section covers the inspect JSON endpoint. This is a content/title alignment concern, not a technical error, and falls outside the scope of technical correctness fixes.
- Using `--insecure` with curl is appropriate for a local self-signed Portainer certificate, but readers in production should use a properly signed certificate instead.
- Hardcoding credentials in a curl command is shown for illustration; users should prefer environment variables or secrets managers in practice.
- Endpoint ID `1` is the common default for a single-environment Portainer install, but this may differ in multi-environment setups.
