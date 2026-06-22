# Validation Summary: How to Run PostgreSQL in Docker with Persistent Data

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker
- Docker Compose
- Docker volumes and bind mounts
- Docker secrets
- PostgreSQL 15
- PostgreSQL initialization scripts
- PostgreSQL backup and restore utilities

## Sources Consulted
- Docker Official Image documentation for PostgreSQL: https://github.com/docker-library/docs/blob/master/postgres/README.md
- Docker Compose services reference: https://docs.docker.com/reference/compose-file/services/
- Docker Compose version and name reference: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Compose networks reference: https://docs.docker.com/reference/compose-file/networks/
- Docker Compose secrets reference: https://docs.docker.com/reference/compose-file/secrets/
- Docker persistent container data documentation: https://docs.docker.com/get-started/docker-concepts/running-containers/persisting-container-data/
- PostgreSQL 15 pg_dump documentation: https://www.postgresql.org/docs/15/app-pgdump.html
- PostgreSQL 15 pg_restore documentation: https://www.postgresql.org/docs/15/app-pgrestore.html
- PostgreSQL 15 pg_isready documentation: https://www.postgresql.org/docs/15/app-pg-isready.html
- PostgreSQL 15 GRANT documentation: https://www.postgresql.org/docs/15/sql-grant.html

## Issues Found
- The Docker Compose examples used the obsolete top-level `version: '3.8'` property. Docker's current Compose specification keeps this field only for backward compatibility and warns that it is obsolete, so I removed it from the Compose snippets.
- The `depends_on` example used `condition: service_healthy` without defining a healthcheck on the `postgres` service in the same snippet. Docker Compose waits for a healthcheck when `service_healthy` is used, so I added a matching `pg_isready` healthcheck.
- The environment variable table stated that `POSTGRES_PASSWORD` is always required. The official PostgreSQL image allows omitting it when `POSTGRES_HOST_AUTH_METHOD=trust` is used, so I clarified that exception while keeping the security-focused guidance intact.

## Review Notes
The PostgreSQL 15 Docker image examples remain version-specific. Current official image documentation notes that PostgreSQL 18 and later changed the default image `PGDATA` path, so this post should be revisited before changing examples from `postgres:15` to newer major versions.
