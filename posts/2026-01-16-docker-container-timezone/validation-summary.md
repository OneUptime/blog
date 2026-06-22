# Validation Summary: How to Set Container Timezone in Docker

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- Docker
- Docker Compose
- Linux timezone configuration and tzdata
- Alpine Linux
- Debian/Ubuntu Docker images
- Node.js
- Python zoneinfo
- Java timezone configuration
- PHP timezone configuration
- PostgreSQL
- MySQL
- MongoDB
- NTP / systemd timedatectl

## Sources Consulted
- Docker CLI reference for `docker run`, `--env`, and `--volume`: https://docs.docker.com/reference/cli/docker/container/run/
- Docker Compose services reference for `environment`, `command`, and service configuration: https://docs.docker.com/reference/compose-file/services/
- Docker Compose version and name reference for obsolete top-level `version`: https://docs.docker.com/reference/compose-file/version-and-name/
- Alpine Linux timezone documentation: https://wiki.alpinelinux.org/wiki/Setting_the_timezone
- Alpine Linux `tzdata` package metadata: https://pkgs.alpinelinux.org/package/v3.20/main/x86/tzdata
- IANA Time Zone Database: https://www.iana.org/time-zones
- GNU C Library `TZ` environment variable documentation: https://sourceware.org/glibc/manual/latest/html_node/TZ-Variable.html
- Node.js CLI documentation for `TZ`: https://nodejs.org/api/cli.html#tz
- Python `zoneinfo` documentation: https://docs.python.org/3/library/zoneinfo.html
- Java TimeZone API documentation: https://docs.oracle.com/en/java/javase/22/docs/api/java.base/java/util/TimeZone.html
- Microsoft OpenJDK timezone configuration guidance: https://learn.microsoft.com/en-us/java/openjdk/timezones
- PHP `date_default_timezone_set` manual: https://www.php.net/manual/en/function.date-default-timezone-set.php
- PostgreSQL date/time and `TimeZone` parameter documentation: https://www.postgresql.org/docs/current/datatype-datetime.html
- MySQL 8.4 server option documentation for `--default-time-zone`: https://dev.mysql.com/doc/refman/8.4/en/server-options.html

## Issues Found
- Plain `docker run -e TZ=America/New_York alpine date` examples were inaccurate because the standard Alpine image does not include timezone data for named IANA zones by default. Updated Alpine examples to install `tzdata` before using named timezones.
- Plain Ubuntu runtime examples assumed `tzdata` was already present. Updated one-off Ubuntu verification to install `tzdata` non-interactively before running `date`.
- Debian/Ubuntu Dockerfile examples linked `/usr/share/zoneinfo/$TZ` before ensuring `tzdata` existed. Updated them to install `tzdata` first with `DEBIAN_FRONTEND=noninteractive`, then link `/etc/localtime`.
- The full Docker Compose example used `version: '3.8'`, which current Compose documentation marks as obsolete. Removed the top-level `version` field.
- `timedatectl list-timezones` is not universally available inside minimal containers. Added a fallback command that lists installed files under `/usr/share/zoneinfo`.

## Review Notes
The article is technically sound after the fixes. The main caveat is that timezone behavior ultimately depends on the base image and runtime libraries used by the application, so application-level timezone settings may still be required even when container-level `TZ` is correct.
