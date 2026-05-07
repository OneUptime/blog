# Validation Summary: How to Use Podman with VS Code Dev Containers

## Status
validated

## Post Type
Guide

## Technologies Covered
- Podman
- Visual Studio Code
- Dev Containers
- `devcontainer.json`
- Containerfiles / Dockerfiles
- Compose / `podman-compose`

## Sources Consulted
- Visual Studio Code: Alternate ways to install Docker - https://code.visualstudio.com/remote/advancedcontainers/docker-options
- Visual Studio Code: Developing inside a Container - https://code.visualstudio.com/docs/devcontainers/containers
- Development Containers specification: Dev Container metadata reference - https://containers.dev/implementors/json_reference/
- Development Containers guide: Using Images, Dockerfiles, and Docker Compose - https://containers.dev/guide/dockerfile
- Podman documentation: `podman system service` - https://docs.podman.io/en/latest/markdown/podman-system-service.1.html
- Podman documentation: `podman machine set` - https://docs.podman.io/en/stable/markdown/podman-machine-set.1.html
- Podman documentation: `podman machine inspect` - https://docs.podman.io/en/stable/markdown/podman-machine-inspect.1.html
- Podman documentation: `podman compose` - https://docs.podman.io/en/v5.6.2/markdown/podman-compose.1.html
- Podman documentation: volume mount options - https://docs.podman.io/en/v4.3/markdown/options/volume.html
- Docker Docs: Version and name top-level elements - https://docs.docker.com/reference/compose-file/version-and-name/

## Issues Found
- The post claimed Podman 4.0+ was sufficient. Current VS Code Podman guidance references Podman 5+, so the prerequisite was updated to `Podman (5.0 or later)`.
- The post described Podman as generally Docker CLI-compatible without qualification. This was tightened to “mostly CLI-compatible,” matching current VS Code guidance.
- The `dockerComposePath` setting was explained as “Podman Compose” even though the configured executable was `podman-compose`. The wording was corrected to reflect that Podman's `podman compose` support relies on an external compose provider such as `podman-compose`.
- The Docker socket section incorrectly implied that `podman machine set --rootful` is the way to enable Podman socket compatibility on macOS and Windows. It was corrected to show that starting the machine exposes the connection, while `--rootful` only switches the forwarded API socket to the rootful service when specifically needed.
- The Linux guidance suggested creating a global `/var/run/docker.sock` symlink to the user Podman socket. That was removed because the Podman API socket already has a documented user-socket location and tools should be pointed at it explicitly instead.
- The Compose example used `version: "3.8"`, which is now obsolete in modern Compose files, and mounted the workspace with `:cached`, which is a Docker-oriented mount option and not a documented Podman volume option. The obsolete `version` line was removed and the volume mount was simplified to `..:/workspace`.
- A troubleshooting comment referenced `userns_mode` inside `devcontainer.json`, which is not a `devcontainer.json` property. It was corrected to refer to Podman run arguments via `runArgs`.
- The macOS troubleshooting section suggested `podman machine set --cpus` and `--memory` as though they were universally available. It was clarified that those options are provider-dependent.

## Review Notes
- The post is technically valid after the corrections above, but Podman support in VS Code Dev Containers is still described by VS Code as compatibility via Docker-compliant CLIs rather than a first-class officially supported engine. Readers should expect occasional edge cases, especially around Compose providers and rootless bind mounts.
