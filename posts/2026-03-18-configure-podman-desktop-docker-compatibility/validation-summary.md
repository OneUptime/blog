# Validation Summary: How to Configure Podman Desktop for Docker Compatibility

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Podman Desktop
- Docker-compatible API and socket
- Docker CLI
- Docker Compose / Podman Compose
- Testcontainers
- VS Code Dev Containers
- Linux systemd user services
- macOS Podman machine

## Sources Consulted
- Podman Desktop: Managing Docker compatibility: https://podman-desktop.io/docs/migrating-from-docker/managing-docker-compatibility
- Podman Desktop: Customizing Docker compatibility: https://podman-desktop.io/docs/migrating-from-docker/customizing-docker-compatibility
- Podman system service manual: https://docs.podman.io/en/latest/markdown/podman-system-service.1.html
- Podman machine inspect manual: https://docs.podman.io/en/stable/markdown/podman-machine-inspect.1.html
- Podman compose manual: https://docs.podman.io/en/v5.3.0/markdown/podman-compose.1.html
- Podman build manual: https://docs.podman.io/en/v5.5.2/markdown/podman-build.1.html
- Docker CLI reference: https://docs.docker.com/reference/cli/docker/
- Docker Compose installation documentation: https://docs.docker.com/compose/install/
- Docker Compose file reference: https://docs.docker.com/reference/compose-file/
- Docker Compose version and name top-level elements: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Buildx CLI reference: https://docs.docker.com/reference/cli/docker/buildx/
- Testcontainers for Java supported Docker environments: https://java.testcontainers.org/supported_docker_environment/
- Testcontainers for Node.js supported container runtimes: https://node.testcontainers.org/supported-container-runtimes/

## Issues Found
- The post overstated Podman Desktop as a full drop-in Docker Desktop replacement where existing workflows work without changes. Updated the language to "many" workflows and "minimal changes" to match Podman Desktop's compatibility scope and known platform differences.
- The Podman Desktop settings flow was inaccurate and did not mention the platform-specific behavior documented by Podman Desktop. Updated it to use Settings > Preferences > Docker Compatibility and to clarify macOS Third-Party Docker Tool Compatibility versus Linux/Windows `DOCKER_HOST` usage.
- The Compose section used legacy `docker-compose` wording and commands. Updated examples to prefer `podman compose` and Docker Compose V2 `docker compose`, while still mentioning `podman-compose` as an external provider.
- The Compose file included the obsolete top-level `version` key. Removed it so the example follows the current Compose Specification.
- The Linux `DOCKER_HOST` examples hard-coded `/run/user/$(id -u)` where official docs use `$XDG_RUNTIME_DIR`. Updated the examples to use `${XDG_RUNTIME_DIR}` with a fallback in the shell profile snippet.
- The macOS `DOCKER_HOST` example used a hard-coded Podman machine socket path. Updated it to derive the current socket from `podman machine inspect --format '{{.ConnectionInfo.PodmanSocket.Path}}'`.
- The `DOCKER_CLI_EXPERIMENTAL=enabled` example was described as disabling Docker CLI version check warnings, which is incorrect. Replaced it with guidance to leave Docker API version negotiation enabled by unsetting `DOCKER_API_VERSION`.
- The Testcontainers example lacked the macOS socket override and was too broad for Ryuk. Updated it to show rootless Linux Ryuk disabling and the documented macOS `TESTCONTAINERS_DOCKER_SOCKET_OVERRIDE`.
- The Buildx example used `podman buildx`, but Buildx is a Docker CLI plugin rather than a Podman subcommand. Updated the example to use `docker buildx version` and fall back to `podman build`.
- The BuildKit wording was inaccurate for Podman build. Updated it to say Dockerfile syntax is supported through `podman build`.

## Review Notes
The post is technically relevant and valid after edits. Compatibility remains workload-dependent, especially for Docker-specific APIs, Buildx/BuildKit features, privileged behavior, networking, and tools that assume Docker Desktop internals.
