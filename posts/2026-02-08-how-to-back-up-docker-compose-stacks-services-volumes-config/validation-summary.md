# Validation Summary: How to Back Up Docker Compose Stacks (Services + Volumes + Config)

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker
- Docker Compose
- Docker volumes and networks
- Bash scripting
- PostgreSQL logical backups
- MySQL/MariaDB logical backups
- MongoDB logical backups
- Redis persistence backups
- Cron-based scheduling

## Sources Consulted
- Docker Compose CLI reference: https://docs.docker.com/reference/cli/docker/compose/
- Docker Compose `config` reference: https://docs.docker.com/reference/cli/docker/compose/config/
- Docker Compose `ps` reference: https://docs.docker.com/reference/cli/docker/compose/ps/
- Docker Compose project name documentation: https://docs.docker.com/compose/how-tos/project-name/
- Docker Compose volumes reference: https://docs.docker.com/reference/compose-file/volumes/
- Docker Compose version and name reference: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Engine volume documentation: https://docs.docker.com/engine/storage/volumes/
- Docker CLI `exec`, `cp`, and `run` help output from the installed Docker CLI.
- Alpine package verification in `alpine:latest` for `docker-cli` and `docker-cli-compose`.
- PostgreSQL `pg_dumpall` documentation: https://www.postgresql.org/docs/current/app-pg-dumpall.html
- MySQL `mysqldump` documentation: https://dev.mysql.com/doc/mysql/en/mysqldump.html
- MongoDB `mongodump` documentation: https://www.mongodb.com/docs/database-tools/mongodump/
- Redis `BGSAVE` documentation: https://redis.io/docs/latest/commands/bgsave/

## Issues Found
- The post only named `docker-compose.yml` as the service definition file. Updated it to include `compose.yaml`, which Docker documents as the preferred default Compose file name.
- The resource discovery commands used `basename $(pwd)` as the Compose project name. Updated them to read the resolved project name from `docker compose config --format json`, because Compose project names can come from `-p`, `COMPOSE_PROJECT_NAME`, top-level `name:`, or directory defaults.
- The backup script copied `docker-compose*.yml` and `docker-compose*.yaml` files but missed `compose.yaml`, `compose.yml`, and `compose.override.yaml` style files. Updated the glob list to include modern Compose file names.
- The database container detection filters treated `docker compose ps --format json` as one object instead of an array. Updated the `jq` filters to iterate with `.[]`.
- The database dump commands used `docker exec -t` while piping dump output. Removed TTY allocation so PostgreSQL, MySQL, and MongoDB dumps are stream-safe.
- The Redis backup used a fixed sleep after `BGSAVE`. Updated it to poll `LASTSAVE` so the script waits for the background save to complete before copying `dump.rdb`.
- The volume backup and restore scripts assumed every named volume was physically named `${project}_${volume}`. Updated both scripts to use the actual volume names from `docker compose config --format json`, which handles default, custom `name:`, and `external` volume names.
- The restore script read `ARCHIVE="$1"` under `set -u`, which exits before printing usage when no argument is provided. Changed it to `ARCHIVE="${1:-}"`.
- The restore script copied project files with a `*` glob, which skipped hidden files such as `.env`. Changed it to copy the project directory contents with `cp -a source/. destination/`.
- The restore script dumped MySQL/MariaDB and MongoDB backups but did not restore them. Added matching restore loops using `mysql` and `mongorestore --archive --gzip --drop`.
- The volume restore command removed only non-hidden files before extraction. Updated it to clear hidden files as well.
- The backup Compose snippet used the obsolete top-level `version` field. Removed it to match current Compose specification guidance.
- The scheduled backup container installed Alpine's `docker-cli` package but not the Compose CLI plugin package, so `docker compose` was unavailable. Added `docker-cli-compose` to the installed packages and verified it provides a working `docker compose`.
- The backup verification script only looked for `project/docker-compose`. Updated the check to match both modern `compose.*.yaml` and legacy `docker-compose.*.yaml` file names.

## Review Notes
The scripts still assume common default database users and unauthenticated local database CLIs inside the containers. Real production stacks often need project-specific credentials, TLS options, replica-aware database tooling, or backup users with narrower privileges. `shellcheck` was not installed in the environment, so Bash validation was limited to `bash -n` syntax checks and targeted command/filter verification.
