# Validation Summary: How to Check Container Health Status in Portainer - Status

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker Engine
- Docker CLI
- Docker Compose / Compose Specification
- Portainer API
- Python (`requests`)

## Sources Consulted
- Portainer docs, "View a container's details": https://docs.portainer.io/user/docker/containers/view
- Portainer docs, "Inspect a container": https://docs.portainer.io/user/docker/containers/inspect
- Portainer docs, "API usage examples": https://docs.portainer.io/sts/api/examples
- Docker docs, `docker container ls` / `docker ps`: https://docs.docker.com/reference/cli/docker/container/ls/
- Docker docs, "Running containers" (`docker inspect` health examples): https://docs.docker.com/engine/containers/run/
- Docker docs, Dockerfile `HEALTHCHECK` reference: https://docs.docker.com/reference/dockerfile/
- Docker docs, Compose file `healthcheck` reference: https://docs.docker.com/reference/compose-file/services/
- Docker docs, Docker Engine API overview: https://docs.docker.com/reference/api/docker_remote_api
- Docker docs, Engine API v1.24 `GET /containers/{id}/json` reference: https://docs.docker.com/reference/api/engine/version/v1.24/

## Issues Found
1. The article body was about container filtering by status and labels, which did not match the title, description, or tags about container health checks. I replaced the UI, CLI, Compose, API, and summary content so the post now explains how to inspect Docker health status.
2. The Portainer UI section claimed list-level filtering behavior and filter types that are not documented in the official Portainer docs used for this review. I replaced that with the documented workflow: open the container details page, then use **Inspect** -> **Text** to view the raw container JSON.
3. The Docker CLI examples were valid commands, but they demonstrated general container filtering rather than health status inspection. I replaced them with documented health-related commands: `docker ps --format` showing `.Status`, `docker ps --filter "health=..."`, and `docker inspect` against `.State.Health`.
4. The Compose snippet configured labels instead of a health check, which would not produce any container health state. I replaced it with a valid `healthcheck:` example from the Compose spec so the article now shows the prerequisite for `starting`, `healthy`, and `unhealthy` states.
5. The Portainer API example listed containers filtered by label, which again did not check container health. I replaced it with a Portainer-proxied Docker inspect request against `/containers/{id}/json` and extracted `State.Health` from the response.

## Review Notes
- Docker health status only exists when the image or container defines a `HEALTHCHECK`; otherwise `State.Health` is absent and `docker ps --filter "health=none"` is the relevant case.
- Portainer's documentation does not separately document Docker health fields, but Portainer documents both raw container inspection and Docker-API proxying. The article now relies on Docker's official definition of `State.Health` for those fields.
- The sample `healthcheck` uses `curl`, which must be present in the image. The post now notes that readers should replace the probe command with one available in their image.
