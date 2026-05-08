# Validation Summary: How to Backup a Podman Volume

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Podman volumes
- Container volume mounts
- tar and gzip archives
- PostgreSQL pg_dump
- Cron
- Shell scripting

## Sources Consulted
- Podman volume export documentation: https://docs.podman.io/en/latest/markdown/podman-volume-export.1.html
- Podman volume command overview: https://docs.podman.io/en/v4.3/markdown/podman-volume.1.html
- Podman volume ls documentation: https://docs.podman.io/en/v5.1.1/markdown/podman-volume-ls.1.html
- Podman run volume option documentation: https://docs.podman.io/en/v5.6.1/markdown/podman-run.1.html
- GNU tar manual: https://www.gnu.org/software/tar/manual/tar.html
- PostgreSQL pg_dump documentation: https://www.postgresql.org/docs/current/app-pgdump.html
- POSIX crontab manual page: https://www.man7.org/linux/man-pages/man1/crontab.1p.html

## Issues Found
- The cron setup example wrote to `/home/user/scripts/backup-volumes.sh` without ensuring that `/home/user/scripts` exists. Added `mkdir -p /home/user/scripts` before creating the script so the command works on a fresh system.
- The retention command used `find /home/user/backups -type d ... -exec rm -rf {} +`, which can match directories recursively and is broader than needed for dated backup directories. Updated it to use `-mindepth 1 -maxdepth 1` so only immediate backup directories under `/home/user/backups` are removed.

## Review Notes
The Podman commands, volume mount syntax, `podman volume export --output`, Go-template use with `podman volume ls --format '{{ .Name }}'`, tar/gzip archive checks, and `pg_dump -U postgres myapp` syntax are consistent with the consulted documentation. The local environment did not have `podman` installed, so CLI verification used official documentation rather than local `--help` output.
