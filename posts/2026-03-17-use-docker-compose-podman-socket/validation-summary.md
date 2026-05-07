# Validation Summary: How to Use Docker Compose with Podman Socket

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Podman system service and socket activation
- Docker-compatible REST API
- Docker Compose
- systemd user and system services
- Podman Machine on macOS
- curl over Unix sockets

## Sources Consulted
- Podman `podman-system-service` documentation: https://docs.podman.io/en/latest/markdown/podman-system-service.1.html
- Podman `podman-machine-start` documentation: https://docs.podman.io/en/latest/markdown/podman-machine-start.1.html
- Podman `podman-machine-inspect` documentation: https://docs.podman.io/en/stable/markdown/podman-machine-inspect.1.html
- Podman `podman compose` documentation: https://docs.podman.io/en/v4.8.3/markdown/podman-compose.1.html
- Podman Desktop Docker compatibility documentation: https://podman-desktop.io/docs/migrating-from-docker/managing-docker-compatibility
- Docker Compose file `version` documentation: https://docs.docker.com/reference/compose-file/version-and-name/

## Issues Found
- The post claimed the Podman socket gives "full Compose v2 compatibility." Podman documents a Docker v1.40 compatibility API layer, and Podman Desktop documents Compose v2 usage with the Podman engine, but "full" compatibility is too broad. Changed this to "supporting many Compose v2 workflows" and "many Docker Compose v2 workloads."
- The example Compose file used the top-level `version: "3.8"` key. Docker documents this key as obsolete and only retained for backward compatibility. Removed the `version` line from the example.
- The opening quote referred to the "official docker-compose tool." Updated this wording to "official Docker Compose CLI" to avoid implying only the legacy hyphenated command.

## Review Notes
The Linux rootless and rootful socket paths match Podman's current documented defaults. The macOS Podman Machine socket discovery and `DOCKER_HOST` usage match current Podman documentation. The curl examples use Podman's documented versioned API behavior and Docker-compatible `/v1.40/containers/json` endpoint.
