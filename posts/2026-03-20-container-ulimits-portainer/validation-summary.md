# Validation Summary: How to Configure Container Ulimits in Portainer - A Practical Guide

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Portainer (CE/BE) UI and API
- Docker Engine CLI (`docker ps`, `docker inspect`, `docker stats`, `docker logs`, `docker exec`, `docker cp`, `docker run`)
- Docker Compose (compose v3.8 file format, `deploy.resources.limits`, healthcheck)
- `jq` for JSON filtering
- `curl` for HTTP API interaction

## Sources Consulted
- Docker Engine CLI reference (https://docs.docker.com/reference/cli/docker/)
- Docker Compose specification (https://docs.docker.com/reference/compose-file/)
- Docker Engine API reference for ContainerInspect / HostConfig fields
- Portainer API documentation (https://docs.portainer.io/api/access) for `/api/auth` and `/api/endpoints/{id}/docker/...` proxy endpoints
- Portainer UI navigation reference (Environments page)

## Issues Found
1. **Inaccurate Portainer UI navigation comment.** The troubleshooting comment said `Settings > Environments > Re-sync`, but in current Portainer (CE 2.x and BE) environments are managed under the top-level **Environments** sidebar entry (not under Settings), and the action is **Refresh** rather than "Re-sync". Updated the comment to `Environments > select environment > Refresh`.

## Review Notes

- **Major content/title mismatch (NOT fixed — out of scope).** The post is titled "How to Configure Container Ulimits in Portainer" and the description promises guidance on configuring ulimits (system resource limits like `nofile`, `nproc`, etc.), but the body of the post never mentions ulimits, the `--ulimit` Docker CLI flag, or the `ulimits:` key in docker-compose. The body is a generic Portainer/Docker container management walkthrough (inspect, stats, logs, exec, cp, basic compose with cpu/memory limits, API auth). A future revision should either (a) add a dedicated section showing `docker run --ulimit nofile=65536:65536`, the compose `ulimits:` key, and how Portainer surfaces ulimits in the container creation form (Advanced container settings > Runtime & Resources > Resources tab in Portainer 2.x), or (b) retitle the post to match the actual generic-container-management content. Per review instructions, I did not add new sections or restructure the post.

- **Compose `version: "3.8"` is obsolete in the current Compose Specification.** It still parses but emits a warning under Docker Compose v2; new compose files should omit the top-level `version:` key. Not a hard error, so left alone.

- **`deploy.resources.limits` caveat.** With the legacy `docker-compose` v1 binary, `deploy:` keys were Swarm-only and ignored by `docker-compose up`. With modern Docker Compose v2 (`docker compose`), `deploy.resources.limits` (cpus, memory) IS honored in standalone mode, so the example works as written on current installations. A reader on a very old setup might be surprised, but this is correct for current tooling.

- All other commands and snippets verified accurate: `docker inspect ... | jq` paths, `HostConfig` fields (`Memory`, `CpuShares`, `CpuQuota`), `docker ps` filter/format syntax, `docker cp` direction-agnostic syntax, `docker logs --tail`, `docker exec -it`, and the Portainer `/api/auth` + `/api/endpoints/{id}/docker/containers/json` proxy endpoint.
