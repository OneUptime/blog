# Validation Summary: How to Run PostgreSQL in a Podman Container

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- PostgreSQL 16
- PostgreSQL official container image
- SQL
- Container volumes and bind mounts
- PostgreSQL backup and restore tools

## Sources Consulted
- PostgreSQL official image documentation on Docker Hub: https://hub.docker.com/_/postgres/
- Podman `podman run` documentation: https://docs.podman.io/en/v5.6.1/markdown/podman-run.1.html
- Podman `podman pull` documentation: https://docs.podman.io/en/stable/markdown/podman-pull.1.html
- PostgreSQL 16 server configuration documentation: https://www.postgresql.org/docs/16/runtime-config.html
- PostgreSQL 16 short command-line configuration options: https://www.postgresql.org/docs/16/runtime-config-short.html
- PostgreSQL backup and restore documentation: https://www.postgresql.org/docs/current/backup-dump.html
- PostgreSQL `pg_dumpall` documentation: https://www.postgresql.org/docs/17/app-pg-dumpall.html

## Issues Found
- The image pull comment said "latest" while the command used the version-specific `postgres:16` tag. Changed the comment to "PostgreSQL 16" so it matches the command.
- Several `podman run` examples used the short image name `postgres:16`. Podman documentation notes that short names are resolved through aliases or configured registries and recommends fully qualified image names for robustness. Updated the examples to use `docker.io/library/postgres:16`.
- The "Creating a Database and User" and "Custom PostgreSQL Configuration" examples reused the earlier `pg-data` volume. The official PostgreSQL image only applies `POSTGRES_USER`, `POSTGRES_DB`, and initialization-time settings when the data directory is empty. Added separate named volumes, `pg-app-data` and `pg-tuned-data`, so those examples initialize as described.
- The custom configuration command comment said the config was "appended", but `-c 'config_file=...'` points PostgreSQL at a custom config file. Updated the comment to say "custom config file."
- The `pg_dumpall` restore example restored into `myapp`. PostgreSQL documentation recommends restoring `pg_dumpall` scripts through `psql` against an existing database such as `postgres`, and using `-X` to avoid `.psqlrc` side effects. Updated the command to `psql -U appuser -X -d postgres`.
- The cleanup example only removed `pg-data`, even though the corrected tutorial creates multiple persistent volumes. Updated the cleanup commands to remove the containers using those volumes before removing `pg-data`, `pg-app-data`, and `pg-tuned-data`.

## Review Notes
The PostgreSQL image documentation notes that initialization scripts in `/docker-entrypoint-initdb.d` only run when the data directory is empty; the post's "first launch" wording is accurate. The bind mount and named volume syntax, SELinux `:Z` suffix, PostgreSQL configuration parameter names, and backup commands are otherwise technically valid for PostgreSQL 16 and current Podman behavior.
