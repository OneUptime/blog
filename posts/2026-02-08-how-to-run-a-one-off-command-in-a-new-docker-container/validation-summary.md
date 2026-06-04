# Validation Summary: How to Run a One-Off Command in a New Docker Container

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Docker Engine
- Docker CLI
- Docker Compose v2
- PostgreSQL client utilities
- Redis CLI
- jq
- Semgrep
- ImageMagick
- Hadolint
- curl
- netshoot
- Node.js
- Python
- Go
- Alpine Linux

## Sources Consulted
- Docker Docs, docker container run CLI reference: https://docs.docker.com/reference/cli/docker/container/run/
- Docker Docs, docker compose run CLI reference: https://docs.docker.com/reference/cli/docker/compose/run/
- Docker Docs, docker container prune CLI reference: https://docs.docker.com/reference/cli/docker/container/prune/
- jq official download documentation: https://jqlang.org/download/
- jqlang/jq GitHub repository: https://github.com/jqlang/jq
- Semgrep Docker image documentation: https://hub.docker.com/r/semgrep/semgrep
- Semgrep CLI and rule-running documentation: https://semgrep.dev/docs/running-rules
- PostgreSQL pg_dump documentation: https://www.postgresql.org/docs/15/app-pgdump.html
- PostgreSQL psql documentation: https://www.postgresql.org/docs/current/app-psql.html
- Redis FLUSHALL command documentation: https://redis.io/docs/latest/commands/flushall/
- Black Docker image documentation: https://hub.docker.com/r/pyfound/black
- Local CLI help output from Docker 29.4.2 and Docker Compose v5.1.3

## Issues Found
- The PostgreSQL backup example redirected output to `/backups/dump.sql` from the host shell, not inside the container. Wrapped the `pg_dump` command in `sh -c` so the redirection happens inside the container and writes to the mounted `/backups` directory.
- The jq example used the older `stedolan/jq` Docker Hub image. Updated it to `ghcr.io/jqlang/jq:latest`, matching current jq documentation.
- The Semgrep example used the moved `returntocorp/semgrep` image and omitted the `semgrep` command after the image name. Updated it to `semgrep/semgrep semgrep --config=auto /src`, matching Semgrep's current Docker image documentation.
- The resource limits section described `--stop-timeout` as a task timeout. Updated the comment to clarify that it controls the stop grace period when a container is stopped.

## Review Notes
The remaining Docker flags and examples are syntactically valid against current Docker CLI and Compose references. Some examples assume supporting services, Docker networks, credentials, input files, or project-specific images already exist, which is appropriate for illustrative one-off command patterns.
