# Validation Summary: How to Configure Registries in Podman Desktop

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Podman Desktop
- Container registries
- `registries.conf`
- Registry authentication with `auth.json`
- Docker Hub, Quay.io, GitHub Container Registry, AWS ECR

## Sources Consulted
- Podman Desktop registry documentation: https://podman-desktop.io/docs/containers/registries
- Podman Desktop mirror registry documentation: https://podman-desktop.io/docs/containers/registries/configuring-mirror-registries
- Podman `login` documentation: https://docs.podman.io/en/latest/markdown/podman-login.1.html
- Podman `logout` documentation: https://docs.podman.io/en/latest/markdown/podman-logout.1.html
- Podman `info` documentation: https://docs.podman.io/en/latest/markdown/podman-info.1.html
- Podman `push` documentation: https://docs.podman.io/en/stable/markdown/podman-push.1.html
- `containers-registries.conf` manual: https://www.mankier.com/5/containers-registries.conf
- `containers-auth.json` manual: https://manpages.ubuntu.com/manpages/jammy/en/man5/containers-auth.json.5.html

## Issues Found
- The Podman Desktop custom registry step used bare host names as registry URL examples. Updated the examples to include `https://`, matching the current Podman Desktop documentation for custom registry locations.
- The authentication credentials section used `podman info --format '{{.Store.GraphRoot}}'` under a comment saying it showed the auth file location. That command returns the container storage graph root, not the registry auth file path. Replaced it with an `echo` of the default Linux auth file path.

## Review Notes
- Podman was not installed in the local review environment, so CLI flags and behavior were checked against official Podman documentation instead of local `--help` output.
- The examples are generally correct for current Podman, but credentials stored in `${XDG_RUNTIME_DIR}/containers/auth.json` on Linux are runtime-scoped and may not persist across reboot unless a persistent auth file such as `~/.config/containers/auth.json` is explicitly used.
