# Validation Summary: How to Configure Docker Socket Compatibility with Podman

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Docker-compatible REST API
- Unix sockets
- TCP sockets
- Docker Compose
- Testcontainers
- VS Code Dev Containers
- Python Docker SDK
- systemd user and system services

## Sources Consulted
- Podman `podman system service` documentation: https://docs.podman.io/en/latest/markdown/podman-system-service.1.html
- Podman API reference index: https://docs.podman.io/en/latest/Reference.html
- Docker CLI environment variable and socket documentation: https://docs.docker.com/reference/cli/docker/
- Docker Compose file reference: https://docs.docker.com/reference/compose-file/
- Docker Compose `version` top-level element documentation: https://docs.docker.com/reference/compose-file/version-and-name/
- Testcontainers for Java container runtime requirements: https://java.testcontainers.org/supported_docker_environment/
- VS Code Dev Containers remote Docker host documentation: https://code.visualstudio.com/remote/advancedcontainers/develop-remote-host
- VS Code Dev Containers Docker options documentation: https://code.visualstudio.com/remote/advancedcontainers/docker-options

## Issues Found
- The rootful Podman socket comment said `/run/podman/podman.sock` was the standard Docker socket location. Changed the wording to clarify that this is the rootful Podman socket; `/var/run/docker.sock` is the standard Docker socket path.
- The Docker Compose examples used the legacy `docker-compose` command. Updated them to `docker compose`, matching the current Docker Compose CLI.
- The example Compose file used the obsolete top-level `version: "3.8"` field. Removed it because current Compose uses the Compose Specification and treats `version` as informative and obsolete.
- The VS Code Dev Containers example used `"docker.host"`, which is not the documented setting for Dev Containers. Updated it to use `containers.environment` with `DOCKER_HOST`.
- The Testcontainers Linux example set `TESTCONTAINERS_DOCKER_SOCKET_OVERRIDE` to the Podman socket. Removed it because current Testcontainers documentation for Linux Podman specifies `DOCKER_HOST` and, for rootless Podman, `TESTCONTAINERS_RYUK_DISABLED=true`.
- The TCP listener command used `tcp:0.0.0.0:2375`, which is not the documented Podman endpoint URI form and exposes an unauthenticated API on all interfaces. Updated it to `tcp://127.0.0.1:2375` and clarified that SSH should be used instead of an unauthenticated TCP listener for remote access.

## Review Notes
Podman's Docker-compatible API is documented as supporting Docker API v1.40, and both compatibility and Libpod API requests are versioned. The guide is Linux-oriented because `podman system service` is documented as available for Linux system service use, while Podman on macOS and Windows uses a Podman machine. Some third-party tools may still have Podman-specific limitations even when the Docker-compatible socket is configured correctly.
