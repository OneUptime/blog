# Validation Summary: How to Debug Docker Compose Service Dependencies

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker
- Docker Compose
- Compose `depends_on`
- Docker health checks
- PostgreSQL
- MySQL
- Redis
- Node.js retry logic
- Shell networking/debugging tools

## Sources Consulted
- Docker Compose services reference: https://docs.docker.com/reference/compose-file/services/
- Docker Compose startup order documentation: https://docs.docker.com/compose/how-tos/startup-order/
- Docker Compose `ps` CLI reference: https://docs.docker.com/reference/cli/docker/compose/ps/
- Docker CLI formatting reference: https://docs.docker.com/engine/cli/formatting/
- Docker Compose version and name top-level elements reference: https://docs.docker.com/reference/compose-file/version-and-name/
- Local Docker Compose CLI help for `docker compose`, `docker compose ps`, `docker compose logs`, `docker compose exec`, and `docker compose up` using Docker Compose v5.1.3.

## Issues Found
- The introductory PostgreSQL examples used the official `postgres:15` image without setting the required initialization environment. Added `POSTGRES_PASSWORD` values so the database container can start when the snippets are copied.
- The migrations example also used `postgres:15` without initialization environment. Added `POSTGRES_PASSWORD: pass` to keep the example runnable.
- The PostgreSQL health check recipe used `${POSTGRES_USER:-postgres}` and `${POSTGRES_DB:-postgres}`, which Docker Compose would interpolate from the host environment before the container starts. Escaped the variables as `$${...}` so the container shell expands them at health-check runtime.
- The MySQL health check recipe used `CMD` form with `-p${MYSQL_ROOT_PASSWORD}`, which would not expand the container environment variable correctly. Changed it to `CMD-SHELL` and escaped the variable as `$${MYSQL_ROOT_PASSWORD}`.
- The complete Compose example used the obsolete top-level `version: '3.8'` key. Removed it because current Docker Compose uses the Compose Specification and warns that `version` is obsolete.

## Review Notes
The Docker Compose dependency conditions, healthcheck fields, `docker compose ps --format json`, `docker inspect --format`, log commands, and `docker compose exec` examples were verified against official documentation and local CLI help. Some commands use common tools such as `jq`, `nc`, `nslookup`, `getent`, `curl`, and `wget`; those must exist in the relevant host or container image.
