# Validation Summary: How to Fix Docker Healthcheck Not Displaying in Portainer - Not Displaying

## Status
validated

## Post Type
Troubleshooting Guide

## Technologies Covered
- Docker Engine
- Dockerfile
- Docker Compose
- Portainer
- `jq`
- `curl`

## Sources Consulted
- Docker Docs: Dockerfile reference (`HEALTHCHECK`) — https://docs.docker.com/reference/dockerfile/
- Docker Docs: Define services in Docker Compose (`healthcheck`) — https://docs.docker.com/reference/compose-file/services/
- Docker Docs: Interpolation — https://docs.docker.com/reference/compose-file/interpolation/
- Docker Docs: Version and name top-level elements — https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Docs: Running containers — https://docs.docker.com/engine/containers/run/
- Portainer Documentation: API documentation — https://docs.portainer.io/api/docs
- Portainer CE API spec 2.39.1 — https://api-docs.portainer.io/versions/ce/2.39.1.yaml
- Portainer Documentation: API usage examples — https://docs.portainer.io/sts/api/examples
- Portainer Documentation: Advanced container settings — https://docs.portainer.io/user/docker/containers/advanced

## Issues Found
- The Step 1 inspect example showed a `Test` array that mixed exec-form `CMD` with shell operators. I corrected it to the documented `CMD-SHELL` form and made the inspect target generic instead of implying a specific image output.
- The Compose example in Step 3 used the top-level `version: "3.8"` field, which Docker now documents as obsolete. I removed it.
- Step 4 stated that Portainer's add-container form includes a Healthcheck section. Current Portainer docs do not document that UI section, so I made the instruction conditional on the deployed Portainer version exposing it.
- Step 5 implied `State.Health.Status` could be `"none"`. Docker documents `starting`, `healthy`, and `unhealthy` when a healthcheck exists; if no healthcheck is configured, `State.Health` is absent. I corrected the explanation and made the inspect commands container-specific.
- Step 6 said any other exit code was reserved. Docker specifically documents exit code `2` as reserved, so I corrected that note.
- Step 7 used an incorrect Portainer snapshot API path (`/api/endpoints/1/docker/snapshot`) and a legacy HTTP `:9000` example. I updated it to the documented `/api/endpoints/1/snapshot` path and the current HTTPS `:9443` default.
- The PostgreSQL Compose example used `${POSTGRES_USER}` and `${POSTGRES_DB}` directly. In Compose, that syntax is interpolated before the container starts, so I escaped them to `$${POSTGRES_USER}` and `$${POSTGRES_DB}` so `pg_isready` reads the container environment variables at runtime.

## Review Notes
- The healthcheck examples that use `curl` assume the image contains `curl`. The Dockerfile example correctly installs it; other images may need an equivalent tool already present in the container.
- Docker Engine 25.0+ and Docker Compose 2.20.2+ also support `start_interval`, but the post does not need it to be technically correct.
- Docker was not installed in the review workspace, so CLI command validation was done against official Docker documentation rather than local `docker --help` output.
