# Validation Summary: How to Set Up Automated Podman Backups

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman containers, volumes, images, export, save, inspect, logs, load, cp, and exec
- Bash scripting
- Cron
- systemd service units and timers
- PostgreSQL, MySQL/MariaDB, MongoDB, and Redis backup commands
- gzip, tar archive validation, find, rsync, email, and webhook notifications

## Sources Consulted
- Podman `podman volume export` documentation: https://docs.podman.io/en/latest/markdown/podman-volume-export.1.html
- Podman `podman export` documentation: https://docs.podman.io/en/v4.3/markdown/podman-export.1.html
- Podman `podman save` documentation: https://docs.podman.io/en/v4.4/markdown/podman-save.1.html
- Podman `podman ps` documentation: https://docs.podman.io/en/v5.7.1/markdown/podman-ps.1.html
- Podman `podman images` documentation: https://docs.podman.io/en/stable/markdown/podman-images.1.html
- Podman `podman inspect` documentation: https://docs.podman.io/en/latest/markdown/podman-inspect.1.html
- systemd timer documentation: https://www.freedesktop.org/software/systemd/man/247/systemd.timer.html
- PostgreSQL `pg_dumpall` documentation: https://www.postgresql.org/docs/current/app-pg-dumpall.html
- MySQL `mysqldump` documentation: https://dev.mysql.com/doc/refman/en/mysqldump.html
- MongoDB `mongodump` documentation: https://www.mongodb.com/docs/database-tools/mongodump
- Redis `BGSAVE` documentation: https://redis.io/docs/latest/commands/bgsave/

## Issues Found
- The image backup loop could exit the full script when no tagged images existed because `grep -v "<none>"` returns status 1 under `set -euo pipefail`. Changed it to a process substitution with `|| true` so empty image lists are handled safely.
- The retention logic preserved the newest backups among only the expired set, not the newest backups overall. Changed it to keep the newest `MIN_BACKUPS` directories overall and only delete older directories that exceed `RETENTION_DAYS`.
- The notification snippet used a final `$?` check, which would not send failure notifications when `set -e` exited the script earlier. Replaced it with an `ERR` trap and a success call at the end, and made notification delivery failures non-fatal.
- The database backup example detected containers by pattern but then executed hard-coded container names such as `postgres-db` and `mysql-db`. Changed it to execute the matched container name.
- The Redis backup example waited a fixed two seconds after `BGSAVE`, but `BGSAVE` runs asynchronously. Changed it to poll Redis persistence state before copying `dump.rdb`.
- The verification archive loop was changed to `read -r` with process substitution to preserve the `ERRORS` counter in the main shell.

## Review Notes
- The commands and systemd unit fields are current and valid against the checked documentation.
- The examples still assume GNU userland tools such as `find -printf`, `tail -n +N`, and `shuf`, which is typical for Linux hosts using systemd but would need adjustment for minimal or non-GNU environments.
