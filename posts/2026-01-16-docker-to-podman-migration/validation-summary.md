# Validation Summary: How to Migrate from Docker Desktop to Podman

## Status
validated

## Post Type
Technical migration guide

## Technologies Covered
- Docker Desktop
- Docker CLI
- Docker Compose
- Podman
- podman-compose
- Podman machine
- Podman sockets and Docker API compatibility
- Container image and volume migration
- GitHub Actions
- GitLab CI

## Sources Consulted
- Podman installation documentation: https://podman.io/docs/installation
- Podman command reference and Docker-compatible CLI overview: https://docs.podman.io/en/latest/markdown/podman-remote.1.html
- Podman machine documentation: https://docs.podman.io/en/stable/markdown/podman-machine.1.html
- Podman machine init documentation: https://docs.podman.io/en/latest/markdown/podman-machine-init.1.html
- Podman machine inspect documentation: https://docs.podman.io/en/latest/markdown/podman-machine-inspect.1.html
- Podman machine set documentation: https://docs.podman.io/en/stable/markdown/podman-machine-set.1.html
- Podman system service/socket documentation: https://docs.podman.io/en/latest/markdown/podman-system-service.1.html
- Podman Compose wrapper documentation: https://docs.podman.io/en/latest/markdown/podman-compose.1.html
- Podman build documentation: https://docs.podman.io/en/stable/markdown/podman-build.1.html
- Podman manifest documentation: https://docs.podman.io/en/stable/markdown/podman-manifest.1.html
- Podman push documentation: https://docs.podman.io/en/stable/markdown/podman-push.1.html
- Podman registries/search documentation: https://docs.podman.io/en/stable/markdown/podman-search.1.html
- Docker image save documentation: https://docs.docker.com/reference/cli/docker/image/save/
- Docker image load documentation: https://docs.docker.com/reference/cli/docker/image/load/
- Docker Compose file reference: https://docs.docker.com/reference/compose-file/
- Docker Compose environment variable documentation: https://docs.docker.com/compose/how-tos/environment-variables/envvars/
- Docker Desktop license documentation: https://docs.docker.com/subscription/desktop-license/

## Issues Found
- Removed the macOS `brew install podman-docker` instruction because `podman-docker` is a Linux compatibility package in this context; the Homebrew Podman formula and official Podman installation guidance do not document a `podman-docker` formula.
- Replaced hard-coded macOS Podman socket paths with `podman machine inspect --format '{{.ConnectionInfo.PodmanSocket.Path}}'`, because current Podman machine documentation shows the socket path can be under a runtime-specific location rather than the older fixed `~/.local/share/containers/podman/machine/podman.sock` path.
- Removed the obsolete top-level `version: '3.8'` field from the Compose example. Docker Compose now uses the Compose Specification, and the legacy version field is no longer required.
- Changed the multi-architecture `podman build` example from `-t` to `--manifest`, because Podman documentation says multi-platform builds use `--manifest` instead of `--tag`.
- Added an explicit destination to `podman manifest push` so the manifest push example identifies the target registry.
- Split the networking Compose example into valid YAML blocks and added a top-level `networks` definition for the custom network example.
- Changed the RHEL/Fedora install comment from "pre-installed" to "available from the default repositories" to avoid implying Podman is always already installed.
- Added `mkdir -p ~/.config/containers` before appending to `~/.config/containers/registries.conf`, so the command works on systems where the user-level containers configuration directory does not already exist.
- Adjusted the rootless `podman run` comment to say it runs without a root daemon, which more accurately describes rootless Podman behavior.

## Review Notes
The remaining commands are broadly correct as migration examples, but real migrations should still test Compose feature compatibility because `podman compose`, `podman-compose`, and Docker Compose connected to the Podman socket do not have identical feature coverage in every release.
