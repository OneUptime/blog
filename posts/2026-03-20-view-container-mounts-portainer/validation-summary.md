# Validation Summary: How to View Container Mount Points in Portainer - Mounts

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Portainer (CE/BE)
- Docker CLI (`docker inspect`, `docker ps`, `docker stats`, `docker logs`, `docker exec`, `docker cp`)
- Docker Compose (v3.8 schema)
- jq (JSON processor)
- Portainer REST API
- curl

## Sources Consulted
- Docker CLI reference: https://docs.docker.com/reference/cli/docker/
- `docker inspect` reference: https://docs.docker.com/reference/cli/docker/inspect/
- `docker ps` filtering and formatting: https://docs.docker.com/reference/cli/docker/container/ls/
- Docker Compose specification (deploy.resources, healthcheck, volumes): https://docs.docker.com/reference/compose-file/
- Portainer API documentation: https://docs.portainer.io/api/docs
- Portainer Docker endpoint proxy: `/api/endpoints/{id}/docker/...` (proxies to Docker Engine API)
- Docker Engine API container JSON structure: https://docs.docker.com/reference/api/engine/

## Issues Found
No technical issues found.

All commands, flags, jq expressions, YAML schema fields, and Portainer API endpoints are syntactically correct and match current official documentation:
- Docker CLI commands (`docker inspect`, `docker ps -a`, `docker stats`, `docker logs --tail`, `docker exec -it`, `docker cp`, `docker ps --filter --format`) are valid.
- jq filters (`.[0].Config`, `.[0].Config.User`, `.[0].HostConfig | {Memory, CpuShares, CpuQuota}`) return the correct fields from Docker inspect output.
- Docker Compose v3.8 schema with `deploy.resources.limits`, `healthcheck`, `environment`, `volumes`, and `networks` is valid.
- Portainer API endpoints `/api/auth` (JWT authentication) and `/api/endpoints/{id}/docker/containers/json` (Docker proxy) are correct.

## Review Notes
- The post title references "Mount Points" specifically, but the body is generic container inspection content (resource limits, healthchecks, logs, etc.) rather than focused on volume mounts. This is a scope/content alignment observation, not a technical error — all stated facts are correct.
- `CpuShares` and `CpuQuota` in the HostConfig jq example are legacy but still-supported fields; newer Docker versions also expose `NanoCpus`. Mentioning both could be useful in the future but is not required for accuracy.
- The `deploy.resources.limits` block in Compose is honored by Compose v2+ outside of Swarm mode; this is correct as written.
- "Filter by status (running, stopped, unhealthy)" — in Docker CLI, `unhealthy` is a health filter rather than a container status, but the post is describing Portainer UI filters, where this combined filtering is exposed, so the statement is accurate in context.
