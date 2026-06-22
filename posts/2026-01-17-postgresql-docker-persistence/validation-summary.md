# Validation Summary: How to Run PostgreSQL in Docker with Persistence

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- PostgreSQL 16 and 17
- Docker Engine
- Docker volumes, bind mounts, and tmpfs mounts
- Docker Compose
- PostgreSQL initialization scripts
- PostgreSQL configuration files and command-line settings
- pg_dump, pg_dumpall, pg_restore, and psql
- PostgreSQL SCRAM-SHA-256 authentication
- Prometheus PostgreSQL exporter

## Sources Consulted
- Docker Official Image for PostgreSQL documentation: https://github.com/docker-library/docs/blob/master/postgres/README.md
- Docker volumes documentation: https://docs.docker.com/engine/storage/volumes/
- Docker Compose file reference: https://docs.docker.com/reference/compose-file/
- Docker Compose services reference, including depends_on and healthcheck behavior: https://docs.docker.com/reference/compose-file/services/
- Docker Compose version top-level element documentation: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Compose Deploy Specification resources documentation: https://docs.docker.com/reference/compose-file/deploy/
- PostgreSQL password authentication documentation: https://www.postgresql.org/docs/current/auth-password.html
- PostgreSQL pg_dump documentation: https://www.postgresql.org/docs/current/app-pgdump.html
- PostgreSQL pg_restore documentation: https://www.postgresql.org/docs/current/app-pgrestore.html
- PostgreSQL SQL dump backup documentation: https://www.postgresql.org/docs/current/backup-dump.html

## Issues Found
- The introduction said data disappears when a container stops. Docker keeps a stopped container's writable layer, but data tied to that layer is not durable across container removal or recreation. Updated the wording to describe the actual risk.
- The named volume and bind mount `docker run` examples omitted `POSTGRES_PASSWORD`. The official PostgreSQL image requires `POSTGRES_PASSWORD` unless host authentication is explicitly set to `trust`. Added `-e POSTGRES_PASSWORD=secretpassword` to both examples.
- The Compose snippets used the obsolete top-level `version: '3.8'` field. Docker Compose now treats this field as informative and emits an obsolete warning. Removed the field.
- The custom configuration section described `postgres -c` arguments as environment variables. Updated the wording to call them command-line options.
- The backup sidecar used short-form `depends_on`, which only guarantees start order and does not wait for PostgreSQL readiness. Added a PostgreSQL healthcheck, changed `depends_on` to `condition: service_healthy`, and added a `pg_isready` wait before the backup loop.

## Review Notes
- The examples target PostgreSQL 16 and 17, where mounting the data volume at `/var/lib/postgresql/data` is correct for the official image. The official image changes the default `PGDATA` and recommended mount target in PostgreSQL 18 and later, so this post should be revisited if it is updated to PostgreSQL 18+.
- The `deploy.resources` example is valid Compose Deploy Specification syntax, but actual support depends on the Compose implementation or deployment platform.
