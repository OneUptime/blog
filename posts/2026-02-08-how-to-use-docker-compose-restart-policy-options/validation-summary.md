# Validation Summary: How to Use Docker Compose restart Policy Options

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker
- Docker Compose
- Compose file service configuration
- Docker container restart policies
- Docker healthchecks
- Docker CLI inspection and monitoring commands
- PostgreSQL Docker Official Image

## Sources Consulted
- Docker Docs: Start containers automatically - https://docs.docker.com/engine/containers/start-containers-automatically/
- Docker Docs: `docker container run` restart policies - https://docs.docker.com/reference/cli/docker/container/run/
- Docker Docs: Compose file `services.restart` reference - https://docs.docker.com/reference/compose-file/services/#restart
- Docker Docs: Compose file `version` top-level element - https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Docs: Dockerfile `HEALTHCHECK` reference - https://docs.docker.com/reference/builder/#healthcheck
- Docker Docs: Compose CLI reference - https://docs.docker.com/reference/cli/docker/compose/
- Docker Docs: `docker compose down` reference - https://docs.docker.com/reference/cli/docker/compose/down/
- Docker Docs: Compose startup order and healthchecks - https://docs.docker.com/compose/how-tos/startup-order/
- Docker Hub: PostgreSQL Official Image environment variables - https://hub.docker.com/_/postgres
- Local CLI help: `docker compose up --help`, `docker compose stop --help`, `docker compose restart --help`, `docker compose down --help`, `docker inspect --help`, `docker events --help`, and `docker run --help`

## Issues Found
- The multi-service Compose example used the obsolete top-level `version: "3.8"` field. Current Compose uses the Compose Specification and treats `version` as informative and obsolete, so I removed it.
- The PostgreSQL service example used `postgres:16` without the required `POSTGRES_PASSWORD` environment variable. I added `POSTGRES_PASSWORD: example` so the example aligns with the PostgreSQL Official Image requirements.
- The exit-code explanation said an application that handles SIGTERM and exits cleanly has exit code 143. That is misleading: 143 commonly means the process terminated because of SIGTERM, while a process that catches SIGTERM and exits successfully records exit code 0. I corrected the paragraph and kept the point that `docker stop` suppresses an immediate restart.

## Review Notes
- The restart policy names, `on-failure[:max-retries]` syntax, backoff behavior, 10-second successful-start rule, and `always` versus `unless-stopped` behavior match Docker's current documentation.
- The healthcheck section is correct that Docker marks containers unhealthy but does not restart standalone containers solely because of health status.
- The `xargs -r` command is valid on GNU/Linux. On macOS/BSD hosts, `xargs` does not support `-r`, so a future portability note could be useful if the blog targets non-Linux users.
