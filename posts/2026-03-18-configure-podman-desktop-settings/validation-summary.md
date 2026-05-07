# Validation Summary: How to Configure Podman Desktop Settings

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- Podman Desktop
- Podman CLI
- Podman machine
- Container registry authentication and registry search configuration
- Podman proxy and engine configuration
- Podman Docker-compatible API
- containers.conf
- storage.conf

## Sources Consulted
- Podman Desktop Settings Reference: https://podman-desktop.io/docs/configuration/settings-reference
- Podman Desktop registry setup documentation: https://podman-desktop.io/docs/containers/registries
- Podman Desktop Docker compatibility documentation: https://podman-desktop.io/docs/migrating-from-docker/managing-docker-compatibility
- Podman `podman machine init` documentation: https://docs.podman.io/en/latest/markdown/podman-machine-init.1.html
- Podman `podman machine set` documentation: https://docs.podman.io/en/stable/markdown/podman-machine-set.1.html
- Podman `podman system service` documentation: https://docs.podman.io/en/latest/markdown/podman-system-service.1.html
- Podman `podman pull` authentication documentation: https://docs.podman.io/en/latest/markdown/podman-pull.1.html
- Podman `podman search` and registries.conf documentation references: https://docs.podman.io/en/stable/markdown/podman-search.1.html
- containers.conf upstream documentation: https://raw.githubusercontent.com/containers/common/main/docs/containers.conf.5.md
- containers-registries.conf upstream documentation: https://raw.githubusercontent.com/containers/image/main/docs/containers-registries.conf.5.md
- containers-storage.conf upstream documentation: https://raw.githubusercontent.com/containers/storage/main/docs/containers-storage.conf.5.md

## Issues Found
- The resource configuration example removed and recreated the Podman machine. That is disruptive and unnecessary for current supported machine providers. Replaced it with `podman machine set --cpus --memory --disk-size`, and added the caveat that disk size can only be increased on an existing machine.
- The proxy CLI example used a systemd service drop-in path without creating the directory and assumed the system service was the right target. Replaced it with a containers.conf drop-in under `/etc/containers/containers.conf.d` using `[engine].env`, then restarted the machine.
- The Docker compatibility section incorrectly tied Docker-compatible API usage to rootful mode. Replaced it with the documented Podman socket / `DOCKER_HOST` flow for Linux and updated the Podman Desktop GUI explanation.
- The macOS containers.conf example edited `/etc/containers/containers.conf` without privilege escalation. Changed it to create and edit the user config path inside the Podman machine.
- The default container settings verification command inspected storage output, which does not verify the shown settings. Replaced it with checks for the default log driver and configured `TZ` environment variable.
- The rootless storage configuration example used `/var/lib/containers/storage`, which is the rootful default location and not suitable for a user-level `~/.config/containers/storage.conf` example. Changed it to a user-owned storage path.

## Review Notes
The post is technically relevant and contains implementation details. Registry login, unqualified search registry syntax, extension guidance, and storage.conf TOML structure were consistent with the consulted documentation after the fixes above. Some Podman machine resource flags remain provider-dependent, so the post now states that caveat.
