# Validation Summary: How to Set Up Communication Between Docker Compose Projects

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker
- Docker Compose
- Docker networking
- Compose external networks
- Compose network aliases
- Host-to-container networking with `host.docker.internal` and `host-gateway`
- PostgreSQL and Redis container examples

## Sources Consulted
- Docker Docs: Networking in Compose - https://docs.docker.com/compose/how-tos/networking/
- Docker Docs: Compose file reference, networks - https://docs.docker.com/reference/compose-file/networks/
- Docker Docs: Compose file reference, services - https://docs.docker.com/reference/compose-file/services/
- Docker Docs: Version and name top-level elements - https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Docs: Docker Compose history and Compose Specification versioning - https://docs.docker.com/compose/intro/history/
- Docker Docs: `docker network create` CLI reference - https://docs.docker.com/reference/cli/docker/network/create/
- Docker Docs: `docker network inspect` CLI reference - https://docs.docker.com/reference/cli/docker/network/inspect/
- Docker Docs: `docker compose down` CLI reference - https://docs.docker.com/reference/cli/docker/compose/down/
- Local Docker CLI help output for `docker network create` and `docker network inspect`.

## Issues Found
- The Compose snippets used the obsolete top-level `version: '3.8'` field. Docker Compose still accepts this for backward compatibility, but current Docker documentation marks it obsolete and warns that it is only informative. Removed the `version` line from all Compose snippets.
- The complete microservices example pre-created `shared-infra` in the startup script while the infrastructure Compose file defined a managed network with the same explicit name. Compose-managed networks are expected to be created and labeled by Compose, so this can fail when the network already exists outside Compose. Updated the infrastructure network definition to `external: true` to match the startup script and the external-network pattern used in the article.
- The `backend-internal` comment described the network as "Internal", which could be confused with Docker Compose's `internal: true` network option. Changed the comment to "Project-specific network" because the snippet does not set `internal: true`.
- The debugging examples used `docker exec api` and `docker inspect api`, but Compose containers are not normally named exactly after the service unless `container_name` is set. Updated the examples to use `docker compose exec api` and `docker compose ps -q api` so they work with default Compose container naming.

## Review Notes
- The remaining examples are technically correct for current Docker Compose, assuming the referenced build contexts and service applications exist.
- The `ping`, `nc`, and `netstat` debugging commands depend on those tools being installed in the target container images.
- The infrastructure project now expects `shared-infra` to exist before `docker compose up`; the included startup script creates it.
