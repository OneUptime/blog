# Validation Summary: How to Run PostgreSQL in Docker and Docker Compose

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- PostgreSQL
- Docker
- Docker Compose
- PostgreSQL official Docker image
- PgBouncer
- Adminer
- PostgreSQL backup and restore tools
- Docker secrets, volumes, networks, health checks, and logging

## Sources Consulted
- PostgreSQL Docker Official Image documentation: https://hub.docker.com/_/postgres and https://github.com/docker-library/docs/blob/master/postgres/README.md
- Docker Compose file reference, including obsolete `version` field: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Compose services reference, including `depends_on.condition: service_healthy`: https://docs.docker.com/reference/compose-file/services/#depends_on
- PostgreSQL documentation for `pg_stat_statements`: https://www.postgresql.org/docs/current/pgstatstatements.html
- PostgreSQL documentation for `uuid-ossp`: https://www.postgresql.org/docs/current/uuid-ossp.html
- PostgreSQL documentation for `pg_dump`: https://www.postgresql.org/docs/current/app-pgdump.html
- PostgreSQL documentation for `pg_restore`: https://www.postgresql.org/docs/current/app-pgrestore.html
- PgBouncer Docker image documentation for `edoburu/pgbouncer`: https://hub.docker.com/r/edoburu/pgbouncer/
- Local Docker CLI help output for Docker 29.4.2 and Docker Compose v5.1.3

## Issues Found
- The Docker Compose examples used the top-level `version: '3.8'` field. Docker Compose now treats `version` as obsolete and only informative, so I removed it from all Compose snippets.
- The post created the `pg_stat_statements` extension but the shown `postgresql.conf` did not preload the module. PostgreSQL requires `pg_stat_statements` in `shared_preload_libraries`, so I added `shared_preload_libraries = 'pg_stat_statements'` to the custom configuration.
- The PgBouncer example used `bitnami/pgbouncer:latest`, which is no longer generally available for free on Docker Hub. I changed the example to `edoburu/pgbouncer:latest` and updated the environment variables and port mapping to match that image's documented configuration.

## Review Notes
- The PostgreSQL Docker image environment variables and initialization script behavior are accurate, including the first-startup-only behavior for `/docker-entrypoint-initdb.d/`.
- The `pg_dump`, `pg_restore`, `pg_dumpall`, `createdb`, `dropdb`, `docker run`, `docker exec`, `docker logs`, `docker port`, and `docker volume inspect` examples use valid command forms.
- The Compose YAML snippets were parsed after editing and are syntactically valid.
- Some production recommendations, such as memory settings, exposed ports, and use of `latest` tags, are workload-dependent and should be tuned or pinned for real deployments, but they are not technically incorrect as tutorial examples.
