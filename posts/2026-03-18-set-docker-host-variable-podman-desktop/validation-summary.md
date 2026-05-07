# Validation Summary: How to Set the DOCKER_HOST Variable for Podman Desktop

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Podman Desktop
- Docker-compatible API sockets
- DOCKER_HOST environment variable
- Docker CLI and Docker Compose
- Testcontainers
- VS Code Dev Containers
- Linux, macOS, Windows, and WSL2 shell configuration

## Sources Consulted
- Podman Desktop documentation: Using the DOCKER_HOST environment variable: https://podman-desktop.io/docs/migrating-from-docker/using-the-docker_host-environment-variable
- Podman Desktop documentation: Managing Docker compatibility: https://podman-desktop.io/docs/migrating-from-docker/managing-docker-compatibility
- Podman Desktop documentation: Customizing Docker compatibility: https://podman-desktop.io/docs/migrating-from-docker/customizing-docker-compatibility
- Podman documentation: podman-system-service: https://docs.podman.io/en/latest/markdown/podman-system-service.1.html
- Podman documentation: podman-machine-inspect: https://docs.podman.io/en/stable/markdown/podman-machine-inspect.1.html
- Docker CLI documentation: docker command reference and DOCKER_HOST behavior: https://docs.docker.com/reference/cli/docker/
- Docker Compose documentation: predefined environment variables: https://docs.docker.com/compose/how-tos/environment-variables/envvars/
- VS Code Dev Containers documentation: develop on a remote Docker host: https://code.visualstudio.com/remote/advancedcontainers/develop-remote-host
- Podman Desktop tutorial: Testcontainers with Podman: https://podman-desktop.io/tutorial/testcontainers-with-podman

## Issues Found
- The Linux examples hard-coded `/run/user/$(id -u)` where official Podman documentation describes the rootless socket under `$XDG_RUNTIME_DIR`. Updated the Linux examples to use `${XDG_RUNTIME_DIR}`.
- The Docker default socket explanation only mentioned `/var/run/docker.sock`. Updated it to include Docker's documented Windows named pipe default.
- The socket discovery section did not show the documented Windows named pipe discovery command. Added `podman machine inspect --format '{{.ConnectionInfo.PodmanPipe.Path}}'`.
- The macOS verification command used `podman info`, which verifies the Podman client connection but not that Docker-compatible tools are using `DOCKER_HOST`. Changed it to `docker info`.
- The PowerShell example hard-coded the default Podman pipe path. Updated it to read `ConnectionInfo.PodmanPipe.Path`, normalize path separators, and set `DOCKER_HOST` from that value.
- The Docker Compose examples used the legacy `docker-compose` command. Updated them to the current `docker compose` command while preserving the same behavior.
- The VS Code Dev Containers example used `docker.host`, but current VS Code documentation identifies `containers.environment` as the setting for environment variables such as `DOCKER_HOST` when the Container Tools extension is installed. Updated the settings example accordingly.

## Review Notes
The post is technically relevant and the corrected workflow matches current Podman Desktop, Podman, Docker, Testcontainers, and VS Code documentation. Some compatibility behavior remains environment-specific, especially on Windows and macOS where Podman Desktop's Docker Compatibility settings can make explicit `DOCKER_HOST` unnecessary.
