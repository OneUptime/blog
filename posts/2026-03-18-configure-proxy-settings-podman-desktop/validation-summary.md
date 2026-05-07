# Validation Summary: How to Configure Proxy Settings in Podman Desktop

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman Desktop
- Podman CLI
- containers.conf
- HTTP, HTTPS, and no-proxy environment variables
- Container runtime environment variables
- Container builds with Containerfile build arguments
- Podman machine on macOS

## Sources Consulted
- Podman Desktop restricted environments and proxy documentation: https://podman-desktop.io/docs/proxy
- Podman Desktop settings reference: https://podman-desktop.io/docs/configuration/settings-reference
- Podman CLI documentation, environment variables and containers.conf: https://docs.podman.io/en/v5.3.2/markdown/podman.1.html
- Podman create documentation, `--http-proxy` behavior for containers: https://docs.podman.io/en/latest/markdown/podman-create.1.html
- Podman build documentation, `--build-arg` and `--http-proxy` behavior: https://docs.podman.io/en/v5.5.2/markdown/podman-build.1.html

## Issues Found
- The Podman Desktop UI steps described an outdated or inaccurate proxy toggle and Save button. Updated the steps to match the current documented options: System, Manual, or Disabled, followed by Update and confirmation.
- The post implied Podman Desktop proxy settings apply uniformly across platforms. Added the documented Linux caveat that Podman Desktop proxy settings do not affect Podman itself on Linux.
- The macOS Podman machine section recommended editing `/etc/environment` inside the VM. Replaced it with the documented approach: configure Podman Desktop proxy settings, restart the Podman machine from Settings > Resources, and use `containers.conf` inside the VM when proxy variables need to be passed into containers.

## Review Notes
The remaining commands and snippets are technically valid as examples. Podman defaults to passing host proxy environment variables into containers and builds when they are set for the Podman process, so explicit `--build-arg` and `-e` examples are still valid but may be redundant in some environments.
