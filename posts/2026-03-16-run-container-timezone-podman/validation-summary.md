# Validation Summary: How to Run a Container with Timezone Configuration in Podman

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Linux containers
- IANA timezone database / tzdata
- Alpine Linux
- Python
- Node.js
- PostgreSQL and Nginx container examples

## Sources Consulted
- Podman `podman run` official documentation for `--tz`: https://docs.podman.io/en/latest/markdown/podman-run.1.html#tz-timezone
- Official Podman blog explaining `--tz` behavior: https://podman.io/blogs/2020/08/24/container-time
- Alpine Linux timezone documentation: https://wiki.alpinelinux.org/wiki/Setting_the_timezone
- musl libc `TZ` environment variable documentation: https://wiki.musl-libc.org/environment-variables
- GNU C Library `TZ` environment variable documentation: https://www.gnu.org/software/libc/manual/html_node/TZ-Variable.html
- Python `time` module documentation for timezone constants and `TZ`: https://docs.python.org/3/library/time.html
- Node.js CLI documentation for `TZ`: https://nodejs.org/api/cli.html#tz

## Issues Found
- Bare `alpine` examples using `-e TZ=Area/City` would remain on UTC because Alpine does not include timezone data by default. Updated those examples to install `tzdata` before running `date`, and added a short note explaining the requirement for minimal images.
- The timezone listing example used `/usr/share/zoneinfo` in bare `alpine`, where that directory is absent by default. Updated the command to install `tzdata` first.
- The application log example used `$(date ...)` inside a double-quoted host shell string, so the host shell would expand it before `podman run` started. Escaped the command substitutions as `\$(date ...)` so they execute inside the container.
- The `/etc/timezone` bind-mount example implied universal host availability. Updated the comment to clarify that it applies on hosts that provide `/etc/timezone`.

## Review Notes
Podman was not installed in the local environment, so Podman-specific flags were verified against official documentation rather than local `podman --help` output. Docker was available and was used only to confirm Alpine `tzdata`, Python `TZ`, and Node.js `TZ` behavior in comparable container images.
