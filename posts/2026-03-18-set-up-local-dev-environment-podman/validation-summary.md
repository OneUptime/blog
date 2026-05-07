# Validation Summary: How to Set Up a Local Development Environment with Podman

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Podman machine
- Podman rootless containers
- Container registries and registries.conf
- Containerfile / Dockerfile image builds
- podman-compose and Compose files
- Docker-compatible Podman API socket
- macOS, Linux, Windows, WSL 2

## Sources Consulted
- Podman Installation Instructions: https://podman.io/docs/installation
- Podman machine init manual: https://docs.podman.io/en/latest/markdown/podman-machine-init.1.html
- Podman run manual: https://docs.podman.io/en/v5.6.1/markdown/podman-run.1.html
- Podman build manual: https://docs.podman.io/en/v5.5.2/markdown/podman-build.1.html
- Podman compose manual: https://docs.podman.io/en/v5.6.2/markdown/podman-compose.1.html
- Podman system service manual: https://docs.podman.io/en/latest/markdown/podman-system-service.1.html
- Podman for Windows guide: https://github.com/containers/podman/blob/main/docs/tutorials/podman-for-windows.md
- containers.conf default configuration: https://raw.githubusercontent.com/containers/common/main/pkg/config/containers.conf
- containers-registries.conf manual: https://github.com/containers/image/blob/main/docs/containers-registries.conf.5.md
- Compose Specification / Docker Compose file reference: https://docs.docker.com/reference/compose-file/version-and-name/

## Issues Found
- The opening claim said Podman gives developers everything Docker does without requiring root privileges. This was too broad because Podman is Docker-compatible for many workflows, not a complete replacement for every Docker feature, and rootless operation applies to rootless containers rather than every installation or system operation. Updated the wording to be more precise.
- The post described Podman commands as forking a process, creating the container, and exiting. That oversimplified the daemonless architecture, especially for attached containers. Updated it to state that Podman does not depend on a central long-running daemon.
- The post said Podman supports the same CLI flags as Docker. Podman is Docker-CLI comparable, but not every Docker flag or workflow is identical. Changed this to "many of the same CLI flags."
- The Podman machine default disk size was listed as 100 GB. Current containers-common default configuration lists 1 CPU, 2048 MB memory, and 10 GB disk unless overridden. Corrected the disk default to 10 GB and noted that config can override it.
- The Compose example included the top-level `version: "3.8"` key. The current Compose Specification keeps this key only for backward compatibility and marks it obsolete. Removed it from the example.

## Review Notes
- The Homebrew macOS install command is valid, but official Podman documentation currently recommends the Podman installer over Homebrew because Homebrew is community maintained.
- Current Podman for Windows documentation focuses on Windows 11 or later and notes that WSLv2 or Hyper-V must be installed before creating Podman machines.
- Podman was not installed in the local review environment, so CLI checks were validated against official manuals rather than local `podman --help` output.
