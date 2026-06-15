# Validation Summary: How to Set Up Docker Container Restart Policies

## Status
validated

## Post Type
Guide

## Technologies Covered
- Docker Engine restart policies
- Docker CLI
- Docker Compose
- Dockerfile health checks
- PostgreSQL Docker Official Image

## Sources Consulted
- Docker Docs: Start containers automatically - https://docs.docker.com/engine/containers/start-containers-automatically/
- Docker Docs: Compose file services reference - https://docs.docker.com/reference/compose-file/services/
- Docker Docs: Compose startup order - https://docs.docker.com/compose/how-tos/startup-order/
- Docker Docs: Dockerfile HEALTHCHECK reference - https://docs.docker.com/reference/dockerfile/
- Docker Docs: Compose version top-level element - https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Hub: PostgreSQL Official Image - https://hub.docker.com/_/postgres
- Local Docker CLI help and Compose parser: Docker 29.4.2, Docker Compose v5.1.3

## Issues Found
- The `always` policy explanation implied Docker restarts a container immediately after `docker stop`. Docker documents that a manually stopped `always` container restarts only after the daemon restarts or the container is manually restarted, so the wording was corrected.
- The Docker Compose PostgreSQL example omitted `POSTGRES_PASSWORD`, which is required by the PostgreSQL Official Image for normal startup. Added the environment variable to keep the example runnable.
- The Compose example used the obsolete top-level `version: '3.8'` field. Removed it because current Docker Compose uses the Compose Specification and treats `version` as obsolete.
- The `depends_on: condition: service_healthy` example referenced a database service without showing a health check. Added a minimal PostgreSQL service with a `healthcheck` so the example demonstrates the condition correctly.

## Review Notes
Verified the restart policy names, `docker run --restart`, `docker update --restart`, `docker inspect --format`, Dockerfile `HEALTHCHECK`, Compose `restart`, Compose `healthcheck`, and `depends_on.condition: service_healthy` syntax. The edited Compose snippets were validated with `docker compose config -q`.
