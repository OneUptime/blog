# Validation Summary: How to Fix Docker Build Failing with 'Return Code Non-Zero'

## Status
validated

## Post Type
Tutorial / Troubleshooting guide

## Technologies Covered
- Docker
- Dockerfile instructions
- Docker Buildx / BuildKit
- Debian/Ubuntu apt
- Alpine Linux apk and BusyBox ash
- npm
- POSIX shell behavior

## Sources Consulted
- Docker CLI reference for `docker buildx debug` and `docker buildx debug build`: https://docs.docker.com/reference/cli/docker/buildx/debug/ and https://docs.docker.com/reference/cli/docker/buildx/debug/build/
- Dockerfile reference for `RUN`, `SHELL`, shell form defaults, and `COPY --chmod`: https://docs.docker.com/reference/builder
- Dockerfile best practices for `apt-get update && apt-get install` and `--no-cache`: https://docs.docker.com/develop/develop-images/dockerfile_best-practices/
- npm CLI documentation for `npm ci`: https://docs.npmjs.com/cli/commands/npm-ci/
- Alpine Linux BusyBox documentation for Alpine's default shell: https://wiki.alpinelinux.org/wiki/BusyBox
- POSIX Shell Command Language pipeline exit status: https://pubs.opengroup.org/onlinepubs/9799919799/utilities/V3_chap02.html
- Local Docker CLI help output for Docker 29.4.2 and Buildx v0.33.0.

## Issues Found
- The `docker build --target debug` example did not define a `debug` stage, so the command would fail unless the reader added a named stage themselves. I changed the Dockerfile example to define `FROM node:18-alpine AS debug` and continue the failing build in `FROM debug AS build`.
- The Alpine `apk add` snippet placed inline comments after line-continuation backslashes, which makes the shell command invalid or changes what gets installed. I removed the inline comments from continued lines so the Dockerfile snippet is syntactically valid.
- The Alpine/bash example showed `SHELL ["/bin/bash", "-c"]` immediately after noting Alpine uses BusyBox `ash`, but Alpine images do not include bash by default. I added `RUN apk add --no-cache bash` before switching the shell.
- The `pipefail` section claimed POSIX sh on Alpine does not support `pipefail`. Current Alpine BusyBox `ash` supports `set -o pipefail`, and POSIX has standardized `pipefail`, though support still varies across `/bin/sh` implementations. I changed the statement to a portable fallback for shells that do not support `pipefail`.

## Review Notes
The Buildx debugger command is correct for current Docker Buildx, but Docker documents it as experimental, so its behavior and availability may change between releases. The package-manager and shell troubleshooting guidance is otherwise accurate for the examples shown.
