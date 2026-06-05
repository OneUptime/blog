# Validation Summary: How to Fix Docker TimeZone Mismatch Between Host and Container

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Docker CLI
- Docker Compose
- Dockerfile builds
- Alpine Linux
- Debian/Ubuntu Linux
- PostgreSQL
- MySQL
- MongoDB
- Python datetime and zoneinfo

## Sources Consulted
- Docker CLI reference for `docker container run`: https://docs.docker.com/reference/cli/docker/container/run/
- Dockerfile reference for `ARG`, `ENV`, `COPY --from`, and build arguments: https://docs.docker.com/reference/dockerfile/
- Docker Compose services reference for `environment`, `volumes`, and `command`: https://docs.docker.com/reference/compose-file/services/
- Alpine Linux timezone documentation: https://docs.alpinelinux.org/user-handbook/0.1a/Installing/manual.html#timezone
- Alpine Linux timezone wiki: https://wiki.alpinelinux.org/wiki/Setting_the_timezone
- PostgreSQL date/time and timezone documentation: https://www.postgresql.org/docs/current/datatype-datetime.html
- MySQL 8.0 timezone support documentation: https://dev.mysql.com/doc/refman/8.0/en/time-zone-support.html
- MongoDB Date documentation: https://www.mongodb.com/docs/manual/reference/method/date/
- Local Docker CLI help output for `docker run`, `docker build`, and `docker compose config`

## Issues Found
- The `TZ` verification example used plain `alpine`, but Alpine does not include `tzdata` by default, so `docker run -e TZ=America/New_York alpine date` still reports UTC. Changed the verification image to `debian:bookworm-slim`, which includes timezone data and works with the shown `TZ` value.
- The text said the `TZ` environment variable works on most images and only called out scratch-based images as a likely exception. Updated the caveat to include Alpine and to clarify that named `TZ` values require timezone data.
- The Alpine Dockerfile removed `tzdata` after setting `ENV TZ=America/New_York`. With `TZ` still set to an IANA name, Alpine needs the timezone data available, so the resulting image reported UTC. Removed the `apk del tzdata` cleanup and adjusted the comment.
- The build-argument section described the timezone as runtime configuration, but Docker `ARG` values are build-time variables. Updated the section title to say build time.
- The PostgreSQL Compose example labeled `PGTZ` as a PostgreSQL server setting. PostgreSQL documents `PGTZ` as a libpq client setting, so the comment was corrected.
- The MySQL example used `--default-time-zone=America/New_York` without noting that named time zones require populated MySQL timezone tables. Changed the example to use a fixed offset and added a caveat comment about named zones.

## Review Notes
- UTC as the production default is technically sound and aligns with common distributed-system practice.
- The MySQL fixed-offset example is syntactically valid, but fixed offsets do not track daylight saving transitions. A future improvement could show the extra initialization step for loading MySQL timezone tables before using `America/New_York`.
