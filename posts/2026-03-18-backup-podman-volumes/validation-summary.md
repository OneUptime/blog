# Validation Summary: How to Backup Podman Volumes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Podman named volumes
- Bind mounts
- Bash scripting
- tar, gzip, and rsync
- PostgreSQL pg_dump
- MySQL/MariaDB mysqldump
- MongoDB mongodump
- Redis BGSAVE and LASTSAVE

## Sources Consulted
- Podman volume export documentation: https://docs.podman.io/en/latest/markdown/podman-volume-export.1.html
- Podman volume import documentation: https://docs.podman.io/en/latest/markdown/podman-volume-import.1.html
- Podman volume create documentation: https://docs.podman.io/en/latest/markdown/podman-volume-create.1.html
- Podman volume inspect documentation: https://docs.podman.io/en/latest/markdown/podman-volume-inspect.1.html
- Podman volume ls documentation: https://docs.podman.io/en/v4.2/markdown/podman-volume-ls.1.html
- Podman run volume option documentation: https://docs.podman.io/en/v4.4/markdown/options/volume.html
- PostgreSQL pg_dump documentation: https://www.postgresql.org/docs/current/app-pgdump.html
- MySQL mysqldump documentation: https://dev.mysql.com/doc/refman/8.0/en/mysqldump.html
- MongoDB mongodump documentation: https://www.mongodb.com/docs/database-tools/mongodump/
- Redis BGSAVE documentation: https://redis.io/docs/latest/commands/bgsave/
- Redis LASTSAVE documentation: https://redis.io/docs/latest/commands/lastsave/

## Issues Found
- The MySQL/MariaDB backup example expanded `$MYSQL_ROOT_PASSWORD` in the host shell, which would fail unless that variable was also set on the host. Changed the command to run through `sh -c` inside the container so the container environment variable is used.
- The Redis backup example used a fixed `sleep 2` after `BGSAVE`. Since `BGSAVE` is asynchronous, two seconds is not a reliable completion check. Changed the example to compare `LASTSAVE` before and after `BGSAVE` and wait until Redis reports a completed save.
- The all-volumes backup script checked the exit status of `gzip` rather than the full `podman volume export | gzip` pipeline. Added `set -o pipefail` and moved the pipeline into the `if` condition so export failures are handled correctly.
- The retention script's `find` command could include the backup root directory itself when matching old directories. Added `-mindepth 1` so only backup subdirectories are considered for deletion.

## Review Notes
Podman was not installed in the review environment, so CLI validation was performed against the current official Podman documentation rather than local `--help` output. The metadata restoration example preserves labels but does not automate all possible driver options; this is acceptable for the current wording but could be expanded in a future version.
