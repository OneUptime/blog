# Validation Summary: How to Use ENTRYPOINT vs CMD in Containerfiles for Podman

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Containerfile / Dockerfile instructions
- ENTRYPOINT and CMD
- Alpine Linux container images
- Node.js container images
- Python container images
- Shell entrypoint scripts

## Sources Consulted
- Podman `podman-run` documentation: https://docs.podman.io/en/v5.5.2/markdown/podman-run.1.html
- Podman `podman-build` documentation: https://docs.podman.io/en/v5.5.2/markdown/podman-build.1.html
- Dockerfile reference for CMD, ENTRYPOINT, shell form, and exec form: https://docs.docker.com/reference/dockerfile/
- Docker JSONArgsRecommended build check: https://docs.docker.com/reference/build-checks/json-args-recommended/
- Node.js official release schedule: https://nodejs.org/en/about/previous-releases
- Node.js Release Working Group schedule: https://github.com/nodejs/Release
- Node Docker Official Image documentation: https://hub.docker.com/_/node
- Alpine Linux release branches: https://www.alpinelinux.org/releases/

## Issues Found
- The CLI-tool example used `FROM alpine:3.19`, but Alpine 3.19 reached end of support on 2025-11-01. Updated it to `alpine:3.23`, which is supported as of 2026-05-07.
- The CLI-tool example installed `jq` inside the container but used `| jq` in the host shell. Since shell pipelines outside `podman run` execute on the host, the container-installed `jq` would not be used. Removed `jq` from the container package install and removed the host pipe from the example command.
- The entrypoint-script example used `FROM node:20-alpine`, but Node.js 20 reached end of life on 2026-04-30. Updated it to `node:24-alpine`, matching the current LTS line as of 2026-05-07.
- The entrypoint script uses `nc`, but the Node Alpine image does not include common extra utilities by default. Added `apk add --no-cache netcat-openbsd` so the script can run as shown.

## Review Notes
The core ENTRYPOINT and CMD explanations, including command override behavior, exec-form recommendations, shell-form caveats, `--entrypoint`, and `exec "$@"` signal-handling guidance, match the official Podman and Dockerfile documentation. The examples remain illustrative; real applications would still need their project files, dependencies, and environment variables such as `DB_HOST` configured correctly.
