# Validation Summary: How to Organize Podman Container Storage Efficiently

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Podman storage drivers and `storage.conf`
- Podman named volumes, bind mounts, and tmpfs mounts
- Podman image, build cache, volume, container, and network pruning
- systemd user services and timers
- Dockerfile multi-stage builds for Node.js containers
- Bash backup and monitoring scripts

## Sources Consulted
- Podman `podman info` documentation: https://docs.podman.io/en/stable/markdown/podman-info.1.html
- Podman `podman run` documentation for volume labels and tmpfs mounts: https://docs.podman.io/en/v5.6.1/markdown/podman-run.1.html
- Podman `podman volume create` documentation: https://docs.podman.io/en/v3.0/markdown/podman-volume-create.1.html
- Podman `podman volume ls` documentation: https://docs.podman.io/en/v4.2/markdown/podman-volume-ls.1.html
- Podman `podman volume prune` documentation: https://docs.podman.io/en/latest/markdown/podman-volume-prune.1.html
- Podman `podman images` documentation: https://docs.podman.io/en/stable/markdown/podman-images.1.html
- Podman `podman image prune` documentation: https://docs.podman.io/en/v3.0/markdown/podman-image-prune.1.html
- Podman `podman system df` documentation: https://docs.podman.io/en/latest/markdown/podman-system-df.1.html
- Podman `podman container prune` documentation: https://docs.podman.io/en/latest/markdown/podman-container-prune.1.html
- Podman `podman network prune` documentation: https://docs.podman.io/en/latest/markdown/podman-network-prune.1.html
- Podman `podman system reset` documentation: https://docs.podman.io/en/v5.5.2/markdown/podman-system-reset.1.html
- `containers-storage.conf` manual page: https://www.mankier.com/5/containers-storage.conf
- Docker multi-stage build documentation: https://docs.docker.com/build/building/multi-stage/
- Docker Node.js guide for production dependency installation patterns: https://docs.docker.com/guides/nodejs/containerize/

## Issues Found
- The cleanup script used `podman volume prune -f` while describing removal of unused volumes generally. Current Podman only prunes anonymous unused volumes by default; named unused volumes require `--all`. Changed the command to `podman volume prune -a -f`.
- The multi-stage Node.js example copied `node_modules` from a Debian-based `node:20` builder into a `node:20-alpine` runtime image. That can break dependencies with native modules and also carries development dependencies into the runtime. Changed the runtime stage to run `npm ci --omit=dev` and copy only the built `dist` output from the builder.
- The `podman system reset` warning said it removes containers and images only. Current Podman documentation states it also removes pods, networks, volumes, build cache, machines, and the configured graphRoot/runRoot storage directories. Updated the warning comment to match.

## Review Notes
The local environment did not have `podman` installed, so command validation was performed against official Podman documentation rather than local CLI help. The examples are otherwise aligned with current Podman storage, volume, pruning, and storage configuration documentation.
