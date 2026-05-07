# Validation Summary: How to Use Podman for Database Administration

## Status
validated

## Post Type
Guide

## Technologies Covered
- Podman
- Podman networking
- Podman Quadlet / systemd integration
- PostgreSQL
- MySQL
- MongoDB
- pgAdmin
- Bash scripting

## Sources Consulted
- Podman `run` / volume documentation — https://docs.podman.io/en/v4.4/markdown/options/volume.html
- Podman `create` / `publish` and rootless privilege behavior — https://docs.podman.io/en/latest/markdown/podman-create.1.html
- Podman Quadlet systemd units — https://docs.podman.io/en/latest/markdown/podman-systemd.unit.5.html
- Podman Quadlet basic usage — https://docs.podman.io/en/latest/markdown/podman-quadlet-basic-usage.7.html
- Podman `network connect` — https://docs.podman.io/en/latest/markdown/podman-network-connect.1.html
- Podman `network exists` — https://docs.podman.io/en/stable/markdown/podman-network-exists.1.html
- Podman `rename` — https://docs.podman.io/en/stable/markdown/podman-rename.1.html
- PostgreSQL Official Image documentation — https://hub.docker.com/_/postgres/
- PostgreSQL 16 documentation: `pg_hba.conf` — https://www.postgresql.org/docs/16/auth-pg-hba-conf.html
- PostgreSQL 16 documentation: `ALTER SYSTEM` — https://www.postgresql.org/docs/16/sql-altersystem.html
- PostgreSQL 16 documentation: WAL settings — https://www.postgresql.org/docs/16/runtime-config-wal.html
- PostgreSQL 16 documentation: replication settings — https://www.postgresql.org/docs/16/runtime-config-replication.html
- PostgreSQL documentation: `pg_basebackup` — https://www.postgresql.org/docs/current/app-pgbasebackup.html
- MySQL Official Image documentation — https://hub.docker.com/_/mysql
- Mongo Official Image documentation — https://hub.docker.com/_/mongo/
- pgAdmin container deployment documentation — https://www.pgadmin.org/docs/pgadmin4/latest/container_deployment.html

## Issues Found
- The rootless security explanation overstated Podman's guarantees by saying it eliminated host-root escalation risk. I changed that to say it reduces the risk, which matches Podman's documented privilege model.
- The PostgreSQL custom configuration example omitted `mkdir -p ~/db-config`, so the redirect could fail on a clean system. I added the directory creation step.
- The custom PostgreSQL configuration example mounted a full custom `postgresql.conf` without setting `listen_addresses = '*'`, which the official Postgres image documentation calls out as necessary for remote/container access. I added that setting.
- The custom configuration example reused the original `pgdata` volume and host port `5432`, which could conflict with the earlier `postgres` container and attempt to reuse the same data directory concurrently. I switched it to its own volume and port.
- The backup section said the script "runs as a Podman container", but the script actually runs on the host and uses `podman exec`. I corrected the wording and added `mkdir -p` so the backup directory exists before the first dump.
- The initialization example reused `pgdata`, which would prevent `/docker-entrypoint-initdb.d` scripts from running after the first PostgreSQL example had already initialized that volume. I changed it to a fresh volume and separate port.
- The replication section did not actually create a replica. It only changed primary settings, and it used `ALTER SYSTEM` for parameters where a reload is insufficient or unnecessary for this setup. I replaced it with a working flow that creates a replication role, adds the required `pg_hba.conf` rule, seeds a replica with `pg_basebackup -R`, and then starts the standby container.
- The pgAdmin monitoring example assumed a shared user-defined network but did not show how to attach the existing `postgres` container to that network. I added the network existence check and the `podman network connect` step.
- The PostgreSQL monitoring queries used `psql -U admin` without specifying a database, which can fail because the earlier example creates `appdb`, not a database named `admin`. I added `-d appdb` to both queries.
- The version-upgrade example exported from `postgres-old` even though the earlier deployment example creates a container named `postgres`. I added an explicit `podman rename postgres postgres-old` step so the sequence is internally consistent.

## Review Notes
- The database image tags used in the post are still published as of 2026-05-07. In particular, `postgres:16-alpine`, `postgres:17-alpine`, `mysql:8.0`, and `mongo:7` remain valid image references in their official repositories.
- The MySQL example is technically correct with `mysql:8.0`, though the official image also publishes newer `8.4` / `lts` tags.
