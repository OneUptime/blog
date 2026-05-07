# Validation Summary: How to Fix Podman Container Timezone Issues

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Linux timezone configuration
- tzdata / IANA zoneinfo database
- Dockerfile container image builds
- Alpine Linux
- Debian/Ubuntu
- Fedora
- Compose files
- PostgreSQL
- MySQL/MariaDB
- Java
- Node.js

## Sources Consulted
- Podman `podman run` documentation: https://docs.podman.io/en/v5.4.1/markdown/podman-run.1.html
- GNU C Library `TZ` variable documentation: https://sourceware.org/glibc/manual/latest/html_node/TZ-Variable.html
- Alpine Linux timezone documentation: https://wiki.alpinelinux.org/wiki/Setting_the_timezone
- Alpine Linux release branches: https://www.alpinelinux.org/releases/
- Compose Specification: https://compose-spec.github.io/compose-spec/spec.html
- PostgreSQL `postgres` server command documentation: https://www.postgresql.org/docs/current/app-postgres.html
- PostgreSQL `SET TIME ZONE` documentation: https://www.postgresql.org/docs/17/sql-set.html
- PostgreSQL official Docker image documentation: https://hub.docker.com/_/postgres/
- MySQL 8.0 time zone support documentation: https://dev.mysql.com/doc/refman/8.0/en/time-zone-support.html
- MySQL release model documentation: https://dev.mysql.com/doc/refman/9.7/en/mysql-releases.html
- MySQL product support EOL announcements: https://www.mysql.com/cn/support/eol-notice.html
- Node.js `TZ` environment variable documentation: https://nodejs.org/download/release/v22.17.0/docs/api/cli.html#tz
- Microsoft OpenJDK timezone configuration documentation: https://learn.microsoft.com/en-us/java/openjdk/timezones
- Fedora Project website: https://www.fedoraproject.org/

## Issues Found
- The Alpine verification examples assumed `/etc/localtime` and `/usr/share/zoneinfo` exist in the base Alpine image. A local check with `docker run --rm alpine:3.19` showed both are absent by default. Changed the verification command to print `%Z %z` and changed the zoneinfo listing command to install `tzdata` first.
- The Debian/Ubuntu Dockerfile linked `/usr/share/zoneinfo/$TZ` before installing `tzdata`, which can fail on minimal images. Reordered the commands so `tzdata` is installed before creating `/etc/localtime`.
- The Alpine examples used `alpine:3.19`, which is past its listed support date. Updated the examples to `alpine:3.23`, a supported branch.
- The Fedora example used `fedora:39`, which is outdated. Updated it to `fedora:43` and installed `tzdata` explicitly before linking `/etc/localtime`.
- The PostgreSQL example used `PGTZ` as if it configured the server timezone. `PGTZ` is a libpq client environment variable, while the server should be configured with the `timezone` parameter. Changed the example to pass `-c timezone=America/New_York` to the PostgreSQL server and added the required `POSTGRES_PASSWORD` for the official image.
- The PostgreSQL SQL example used `SET timezone = ...`; while accepted, the documented timezone-specific form is `SET TIME ZONE ...`. Updated the example to the documented form.
- The MySQL example used `mysql:8.0`, which Oracle now lists under Sustaining Support with a recommendation to upgrade to MySQL 8.4 LTS or 9.7 LTS. Updated the example to `mysql:8.4`.
- The MySQL `podman exec` examples referenced `my-mysql` without naming the container. Added `--name my-mysql` to the run command.
- The MySQL timezone table loading command piped `mysql_tzinfo_to_sql` output to a host-side `mysql` command. Changed it to run the whole pipeline inside the container.
- The MySQL text described loading timezone tables as "persistent MySQL timezone configuration." The official MySQL documentation says named time zones require populated timezone tables, so the wording was corrected to "named MySQL timezone support."

## Review Notes
- Podman also has a native `--tz` flag that can set an area-based timezone, GMT time, or `local`. The post remains technically correct without adding a new section, but mentioning `--tz` would make a future revision more Podman-specific.
- The advice to prefer UTC for servers and logs is sound. Application-specific timezone behavior should still be verified in each runtime because not every application relies only on libc, `/etc/localtime`, or `TZ`.
