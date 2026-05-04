# Validation Summary: How to Copy Files Into and Out of Containers in Portainer

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Portainer (CE/BE)
- Docker CLI (`docker cp`, `docker ps`, `docker inspect`, `docker stats`, `docker logs`, `docker exec`)
- Docker Compose (v3.8 schema)
- Portainer HTTP API
- jq (JSON processor)
- curl

## Sources Consulted
- Docker CLI reference for `docker cp`: https://docs.docker.com/reference/cli/docker/container/cp/
- Docker CLI reference for `docker ps`, `inspect`, `stats`, `logs`, `exec`: https://docs.docker.com/reference/cli/docker/
- Docker Compose specification (deploy.resources, healthcheck, restart): https://docs.docker.com/compose/compose-file/
- Portainer API documentation (auth + Docker proxy endpoints): https://docs.portainer.io/api/docs and https://app.swaggerhub.com/apis/portainer/portainer-ce
- jq manual: https://jqlang.github.io/jq/manual/

## Issues Found
No technical issues found.

- `docker cp /host/path container-name:/container/path` and the reverse form are correct syntax for Docker's copy command.
- `docker ps -a`, `docker stats`, `docker logs --tail`, `docker inspect`, `docker exec -it` flags and usage verified.
- `docker ps --filter "status=running" --filter "label=..." --format "table {{.Names}}\t..."` syntax is valid.
- Portainer API endpoints `/api/auth` (POST returns `jwt`) and `/api/endpoints/{id}/docker/containers/json` (Docker proxy) are correct.
- Compose v3.8 example with `deploy.resources.limits`, `healthcheck` (CMD form), `restart: always`, and named volumes/networks is syntactically valid. Modern Docker Compose v2 honors `deploy.resources.limits` for non-Swarm runs.
- jq filters (`.[0].Config`, `.[0].Config.User`, `.[0].HostConfig | {Memory, CpuShares, CpuQuota}`) are correct against the `docker inspect` JSON shape.

## Review Notes
- The post's title focuses on copying files into/out of containers, but the body devotes most space to general container management (inspection, stats, logs, troubleshooting) and only briefly shows the two `docker cp` commands. This is a content/scope mismatch rather than a technical error, so no changes were made per the "fix only technical errors" guidance.
- The Compose top-level `version: "3.8"` field is now considered obsolete by Docker Compose v2 (it emits a warning but still parses correctly); it is not technically wrong.
- The Portainer UI navigation references (Stats, Logs, Console, Inspect) match Portainer 2.x behavior. If Portainer's UI labels change in future major releases, these step descriptions may need refreshing.
