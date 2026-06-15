# Validation Summary: How to Debug Docker Compose Scaling Issues

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Docker
- Docker Compose
- Compose file syntax
- Docker networking and DNS
- Nginx reverse proxy/load balancing
- PostgreSQL
- PgBouncer

## Sources Consulted
- Docker Compose CLI reference: `docker compose up` - https://docs.docker.com/reference/cli/docker/compose/up/
- Docker Compose CLI reference: `docker compose logs` - https://docs.docker.com/reference/cli/docker/compose/logs/
- Docker Compose CLI reference: `docker compose exec` - https://docs.docker.com/reference/cli/docker/compose/exec/
- Docker Compose CLI reference: `docker compose events` - https://docs.docker.com/reference/cli/docker/compose/events/
- Docker Compose file reference: services, ports, expose, healthcheck, depends_on - https://docs.docker.com/reference/compose-file/services/
- Docker Compose file reference: version and name top-level elements - https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Compose Deploy Specification - https://docs.docker.com/reference/compose-file/deploy/
- Docker Compose networking guide - https://docs.docker.com/compose/how-tos/networking/
- Nginx upstream module documentation - https://nginx.org/en/docs/http/ngx_http_upstream_module.html
- Nginx HTTP load balancing documentation - https://nginx.org/en/docs/http/load_balancing.html
- PostgreSQL runtime connection settings - https://www.postgresql.org/docs/current/runtime-config-connection.html
- Docker Official Image documentation for PostgreSQL - https://hub.docker.com/_/postgres

## Issues Found
- The post described Compose container names as `project_service_index`, which is the legacy separator style. Updated the pattern to `project-service-index` and aligned examples with current Compose naming.
- The Compose snippets used the obsolete top-level `version: '3.8'` field. Removed those fields because current Compose validates against the Compose Specification and warns when `version` is used.
- The Nginx example mounted a `server`/`upstream` snippet over `/etc/nginx/nginx.conf`, which would be invalid without the required top-level Nginx contexts. Changed the mount target to `/etc/nginx/conf.d/default.conf`.
- The PostgreSQL example used `POSTGRES_MAX_CONNECTIONS=100`, which is not a supported environment variable for the official `postgres` image. Replaced it with a server command that sets `max_connections`.
- The debugging command for specific replica logs used `docker compose logs -f api-3`, but `docker compose logs` accepts service names and uses `--index` for replica selection. Changed it to `docker compose logs -f --index 3 api`.
- The replica connectivity command used `docker compose exec api-1`, but `docker compose exec` accepts a service name and uses `--index` for replica selection. Changed it to `docker compose exec --index 1 api ping -c 2 api`.
- The event-monitoring command used unsupported `docker compose events --filter service=api` syntax. Changed it to `docker compose events api`, matching the command's service argument syntax.
- The Nginx section described `max_fails`/`fail_timeout` as health checks. Updated the wording to passive failure handling.
- The deploy section said `deploy` requires Compose v3+ and is fully supported only in Swarm mode. Updated the note to current Compose Specification wording and clarified that rolling update/rollback behavior is Swarm-specific.

## Review Notes
The guide is technically relevant and useful. Some examples remain intentionally illustrative, such as application-specific pool environment variables and PgBouncer image configuration, which should be verified against the chosen application and image before production use.
