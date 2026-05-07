# Validation Summary: How to Start the Podman Socket for API Access

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- systemd user and system services
- Podman REST API and Docker-compatible API
- Unix sockets
- Docker CLI and Docker Compose
- curl and jq

## Sources Consulted
- Podman system service documentation: https://docs.podman.io/en/latest/markdown/podman-system-service.1.html
- Podman REST API reference: https://docs.podman.io/en/latest/_static/api.html
- Podman API static reference examples: https://docs.podman.io/en/v3.0/_static/api-static.html
- systemd loginctl manual: https://www.freedesktop.org/software/systemd/man/loginctl.html
- Docker Compose environment variables documentation: https://docs.docker.com/compose/how-tos/environment-variables/envvars/
- Docker Compose CLI reference: https://docs.docker.com/reference/cli/docker/compose/

## Issues Found
- The API curl examples used `/v4.0.0/libpod/...`, which implied a Podman 4.0-specific Libpod API path in a general guide. Updated the Libpod examples to use the documented unversioned `/libpod/...` paths.
- The Docker-compatible API example used `/v1.41/containers/json`. Podman's official system service documentation describes the compatibility layer as targeting Docker API v1.40. Updated the example to `/v1.40/containers/json`.

## Review Notes
The Podman systemd socket commands, rootless and rootful socket paths, `podman system service --time` usage, lingering command, and `DOCKER_HOST` examples match the official documentation. Docker Compose compatibility depends on the installed Compose implementation and the subset of Docker API behavior a compose file needs, but the documented `DOCKER_HOST` approach is correct.
