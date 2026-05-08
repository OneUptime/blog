# Validation Summary: How to Restore a Podman Volume from Backup

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Podman
- Podman named volumes
- Container volume mounts
- tar/gzip archives
- PostgreSQL container restore workflow

## Sources Consulted
- Podman `podman volume import` documentation: https://docs.podman.io/en/latest/markdown/podman-volume-import.1.html
- Podman `podman volume export` documentation: https://docs.podman.io/en/stable/markdown/podman-volume-export.1.html
- Podman volume command overview: https://docs.podman.io/en/v4.3/markdown/podman-volume.1.html
- Podman volume mount option documentation: https://docs.podman.io/en/v4.4/markdown/options/volume.html
- PostgreSQL `psql` documentation: https://www.postgresql.org/docs/current/app-psql.html
- PostgreSQL Docker Official Image documentation: https://hub.docker.com/_/postgres/
- GNU tar manual: https://www.gnu.org/software/tar/manual/tar.html
- Local BusyBox tar help output for Alpine-compatible tar behavior

## Issues Found
- The "Restore with Permission Preservation" example used `tar --preserve-permissions` inside `docker.io/library/alpine:latest`. Alpine's default `tar` is BusyBox tar, which does not support the GNU tar `--preserve-permissions` option. Updated the example to use BusyBox-compatible `tar xzf ... --numeric-owner -C /target`, and clarified that file modes and numeric ownership are preserved.

## Review Notes
- `podman volume import` imports into an existing volume and merges archive contents with existing contents, with archive contents taking precedence. The examples generally create or recreate volumes first, which avoids stale files. The bulk restore loop creates missing volumes but does not clear existing volumes before import, so existing files not present in the backup could remain if rerun against non-empty volumes.
- Podman was not installed in the local environment, so Podman command validation was performed against official Podman documentation rather than local `--help` output.
