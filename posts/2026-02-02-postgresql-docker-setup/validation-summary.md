# Validation Summary: How to Set Up PostgreSQL with Docker

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- PostgreSQL 16
- Docker (CLI)
- Docker Compose
- psycopg2 (Python PostgreSQL driver)
- node-postgres / `pg` (Node.js PostgreSQL driver)
- `pg_dump`, `pg_isready`, `psql` (PostgreSQL client tools)

## Sources Consulted
- Official PostgreSQL Docker image documentation: https://hub.docker.com/_/postgres
- Docker `run` CLI reference (volumes, env vars, ports): https://docs.docker.com/reference/cli/docker/container/run/
- Docker bind mounts guidance: https://docs.docker.com/engine/storage/bind-mounts/
- Docker Compose specification: https://docs.docker.com/compose/compose-file/
- PostgreSQL 16 documentation (config parameters, `pg_dump`, `pg_isready`): https://www.postgresql.org/docs/16/
- psycopg2 docs: https://www.psycopg.org/docs/
- node-postgres docs: https://node-postgres.com/

## Issues Found
- **Bind mount with relative path in `docker run`**: The "Custom PostgreSQL Configuration" section used `-v ./postgresql.conf:/etc/postgresql/postgresql.conf`. With the `docker run -v` flag, relative paths are unreliable — historically (pre-Docker Engine 23.0) a path not starting with `/` was interpreted as a named volume, which would either fail or create an unintended volume. Replaced with `-v "$(pwd)/postgresql.conf:/etc/postgresql/postgresql.conf"` for portability. (The relative path in the docker-compose `volumes:` block is fine because Compose resolves relative paths against the compose file's directory.)

## Review Notes
- The `version: '3.8'` field in the docker-compose example is harmless but obsolete under the modern Compose Spec; Docker Compose v2 ignores it. Left as-is since it isn't incorrect.
- The post states that init scripts in `/docker-entrypoint-initdb.d/` are `.sql` or `.sh`. The image entrypoint additionally supports `.sql.gz`, `.sql.xz`, and `.sql.zst`. Not incorrect, just non-exhaustive.
- `SERIAL` is used in the example schema; this is still valid in PostgreSQL 16 but `GENERATED ALWAYS AS IDENTITY` is the modern preferred form. Not an error.
- The backup compose service uses `depends_on: [postgres]` (short form). It would benefit from `condition: service_healthy` to wait for the healthcheck, but the short form is still valid.
- PostgreSQL 16 is current at the time of writing but PostgreSQL 17 is GA; readers running greenfield deployments may want to bump the image tag.
