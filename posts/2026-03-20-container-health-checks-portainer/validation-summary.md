# Validation Summary: How to Configure Container Health Checks in Portainer - A Practical Guide

## Status
validated

## Post Type
Tutorial / Practical Guide

## Technologies Covered
- Portainer (CE / Business Edition)
- Docker (CLI and Engine API)
- Docker Compose (compose file format)
- Portainer HTTP API (auth + Docker proxy endpoints)
- jq (JSON processing in shell examples)

## Sources Consulted
- Docker Compose specification — healthcheck section: https://docs.docker.com/reference/compose-file/services/#healthcheck
- Docker Compose specification — deploy.resources: https://docs.docker.com/reference/compose-file/deploy/#resources
- Docker CLI reference (`docker ps`, `docker inspect`, `docker stats`, `docker logs`, `docker exec`, `docker cp`): https://docs.docker.com/reference/cli/docker/
- Docker `--format` and `--filter` reference: https://docs.docker.com/engine/cli/formatting/
- Portainer API documentation — authentication: https://docs.portainer.io/api/access
- Portainer API documentation — Docker proxy endpoints (`/api/endpoints/{id}/docker/...`): https://docs.portainer.io/api/docs

## Issues Found
No technical issues found. All commands, the compose `healthcheck` block, the Docker CLI invocations, the jq queries against `docker inspect` output, and the Portainer API authentication / container-listing examples are syntactically and semantically correct.

## Review Notes
- The `version: "3.8"` top-level key in the compose example is technically obsolete in the current Compose Specification (modern `docker compose` ignores it and emits a warning). It is not incorrect — files using it still parse and run — so no edit was made, but future revisions could drop the line.
- The `deploy.resources.limits` block is honored by Docker Compose v2 even outside Swarm mode, so the example works as written for typical `docker compose up` usage.
- The compose `healthcheck` example could optionally include `start_period` (useful for slow-starting apps) and `start_interval` (added in Docker Engine 25.0); these are enhancements, not corrections.
- The post is titled around health checks but the body is largely generic container inspection content — a scope/editorial observation, not a technical defect.
- The Portainer UI path "Settings > Environments > Re-sync" is approximate; current Portainer versions surface environment management under the **Environments** entry in the left sidebar, where the connection can be refreshed. The wording is close enough to guide a user but could be tightened in a future pass.
