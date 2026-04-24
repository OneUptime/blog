# Validation Summary: How to Deploy PostgreSQL via Portainer - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker Compose / Portainer stacks
- PostgreSQL 16
- pgAdmin 4
- SQL initialization scripts
- PostgreSQL backup and restore tooling (`pg_dump`, `pg_restore`)

## Sources Consulted
- Portainer stack deployment docs: https://docs.portainer.io/sts/user/docker/stacks/add
- Portainer relative path volume docs: https://docs.portainer.io/sts/advanced/relative-paths
- Docker Compose top-level `version` docs: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker PostgreSQL advanced configuration and initialization guide: https://docs.docker.com/guides/postgresql/advanced-configuration-and-initialization/
- Docker Official Image `postgres` docs: https://github.com/docker-library/docs/blob/master/postgres/README.md
- Docker `docker exec` CLI reference: https://docs.docker.com/reference/cli/docker/container/exec
- pgAdmin container deployment docs: https://www.pgadmin.org/docs/pgadmin4/latest/container_deployment.html
- PostgreSQL `initdb` docs: https://www.postgresql.org/docs/16/app-initdb.html
- PostgreSQL resource configuration docs: https://www.postgresql.org/docs/16/runtime-config-resource.html
- PostgreSQL logging configuration docs: https://www.postgresql.org/docs/16/runtime-config-logging.html
- PostgreSQL `pg_dump` docs: https://www.postgresql.org/docs/16/app-pgdump.html
- PostgreSQL `pg_restore` docs: https://www.postgresql.org/docs/current/app-pgrestore.html
- PostgreSQL trigger behavior docs: https://www.postgresql.org/docs/16/trigger-definition.html
- PostgreSQL PL/pgSQL trigger function docs: https://www.postgresql.org/docs/16/plpgsql-trigger.html
- PostgreSQL `ALTER DEFAULT PRIVILEGES` docs: https://www.postgresql.org/docs/16/sql-alterdefaultprivileges.html

## Issues Found
- The stack used relative bind mounts (`./postgresql.conf` and `./init`) even though Portainer documents relative-path volume support only for Git-based deployments with the Business Edition feature enabled. I replaced them with absolute host paths under `/opt/postgresql` and updated the surrounding instructions so the example works as a normal Portainer stack.
- The Compose snippet used the top-level `version` field, which Docker now documents as obsolete. I removed it.
- The permissions example only granted access on existing tables and sequences in an empty schema, so it would not apply to future objects created in `api`. I added `ALTER DEFAULT PRIVILEGES` statements so the initialization script does what the guide implies.
- The audit trigger function wrote to `audit.changes`, but the table was never created. I added the table definition so the example can actually be used.
- The trigger function always returned `NEW`, which is not correct trigger-function behavior for `DELETE` operations. I updated it to return `OLD` for deletes, matching PostgreSQL’s trigger documentation.
- The backup-copy example assumed `./backups/` already existed. I added `mkdir -p ./backups` before `docker cp` so the command sequence works as written.

## Review Notes
- `postgres:16-alpine` remains a valid supported PostgreSQL 16 image tag as of April 24, 2026, even though newer major PostgreSQL releases exist.
- The pgAdmin `latest` tag is technically valid per pgAdmin’s container docs, but a pinned tag would be more reproducible for long-lived tutorials.
- PostgreSQL init scripts in `/docker-entrypoint-initdb.d` only run when the data directory is empty on first initialization. Reusing an existing `postgres_data` volume will skip them.
- The audit example now includes the log table and trigger function, but readers still need to create `CREATE TRIGGER` statements on the specific tables they want to audit.
- Docker was not installed in this review environment, so validation was performed against official documentation rather than by executing the container commands locally.
