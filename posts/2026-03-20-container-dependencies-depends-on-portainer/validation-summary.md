# Validation Summary: How to Set Up Container Dependencies (depends_on) in Portainer Stacks

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker Compose (`depends_on` directive, healthchecks)
- Portainer (stacks deployment)
- PostgreSQL 16 (`pg_isready`)
- Redis 7 (`redis-cli ping`)
- Nginx 1.25
- Python (`psycopg2` connection retry)

## Sources Consulted
- Docker Compose `depends_on` reference: https://docs.docker.com/compose/compose-file/05-services/#depends_on
- Docker Compose healthcheck reference: https://docs.docker.com/compose/compose-file/05-services/#healthcheck
- Docker Compose Specification (services and conditions): https://github.com/compose-spec/compose-spec/blob/master/spec.md
- PostgreSQL `pg_isready` docs: https://www.postgresql.org/docs/current/app-pg-isready.html
- Redis `PING` command: https://redis.io/commands/ping/
- psycopg2 documentation: https://www.psycopg.org/docs/

## Issues Found
No technical issues found.

The three `depends_on` conditions (`service_started`, `service_healthy`, `service_completed_successfully`) are accurately described and match the Compose Specification. The PostgreSQL and Redis healthcheck commands are canonical and exit with the expected status codes. The Python retry code is syntactically valid and implements proper exponential backoff with re-raising on the final attempt.

## Review Notes
- The Compose top-level `version: "3.8"` field is technically obsolete in Docker Compose v2 (Compose Specification) and will emit a warning when deployed. It still works, so it is not incorrect, but future revisions could safely drop the `version` line.
- The Redis healthcheck in the multi-service stack omits `timeout`, `retries`, and `start_period`. Compose applies defaults (`timeout: 30s`, `retries: 3`, `start_period: 0s`), so this remains valid — just less explicit than the earlier example.
- For stricter database readiness, `pg_isready -U postgres -d postgres` could be used to check a specific database, but the base form is a reasonable default for the example.
- Author wisely notes that `depends_on` alone is not sufficient — application-level retry logic remains important, particularly for transient failures during the lifetime of the container (not just at startup).
