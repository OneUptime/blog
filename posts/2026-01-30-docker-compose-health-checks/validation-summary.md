# Validation Summary: How to Create Docker Compose Health Checks

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker
- Docker Compose
- Docker health checks
- Docker Compose `depends_on` conditions
- PostgreSQL `pg_isready`
- MySQL `mysqladmin`
- Redis `redis-cli`
- Node.js HTTP health check script
- YAML
- Bash

## Sources Consulted
- Docker Compose services reference: https://docs.docker.com/reference/compose-file/services/
- Docker Compose startup order documentation: https://docs.docker.com/compose/how-tos/startup-order/
- Dockerfile `HEALTHCHECK` reference: https://docs.docker.com/reference/dockerfile/
- Docker Compose `version` top-level element documentation: https://docs.docker.com/reference/compose-file/version-and-name/
- PostgreSQL `pg_isready` reference: https://www.postgresql.org/docs/current/reference.html
- MySQL `mysqladmin` reference: https://dev.mysql.com/doc/refman/9.5/en/mysqladmin.html
- Redis `PING` command reference: https://redis.io/docs/latest/commands/ping/
- Redis CLI documentation: https://redis.io/docs/latest/develop/tools/cli/
- Node.js HTTP API documentation: https://nodejs.org/api/http.html

## Issues Found
- The `start_interval` table entry said it was available in Compose v2.3+ and defaulted to the regular `interval`. Docker's current docs list `start_interval` with the healthcheck duration fields introduced in Docker Compose v2.20.2, and the Dockerfile `HEALTHCHECK` reference documents a 5s default and Docker Engine 25.0+ requirement. Updated the version note and default.
- The text said Docker Compose waits for readiness with health checks alone. Compose only waits for health checks when a dependency uses `depends_on` with `condition: service_healthy`. Updated the sentence to mention `depends_on` conditions.
- The complete Compose example used the obsolete top-level `version: "3.9"` field. Docker Compose now treats `version` as informative, obsolete, and warning-generating. Removed it from the example.
- The `/dev/tcp` fallback was described as a generic shell built-in, but `/dev/tcp` is a Bash feature and is not available in every `/bin/sh`. Updated the example to call `bash -c` and clarified that Bash must be installed.
- The troubleshooting note said a service must bind to `0.0.0.0`, not `127.0.0.1`. A health check using `localhost` runs inside the same container network namespace, so loopback can be valid for the check itself. Updated the wording to require `0.0.0.0` only when other containers must connect.

## Review Notes
- Validated all YAML snippets with PyYAML and validated the complete dependency example with `docker compose config`.
- The MySQL example uses `mysqladmin ping`, which is valid for server availability. For stricter application readiness, a query-based check may be better because MySQL documents that `mysqladmin ping` can return success when the server is running but refuses a connection.
