# Validation Summary: How to Verify Your Podman Installation

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman CLI
- Rootless containers and Linux user namespaces
- OCI runtimes
- Container image and lifecycle operations
- Podman networking
- Podman storage
- Podman systemd socket and REST API

## Sources Consulted
- Podman command documentation: https://docs.podman.io/en/latest/markdown/podman.1.html
- Podman info documentation: https://docs.podman.io/en/stable/markdown/podman-info.1.html
- Podman system service documentation: https://docs.podman.io/en/latest/markdown/podman-system-service.1.html
- Podman system check documentation: https://docs.podman.io/en/stable/markdown/podman-system-check.1.html
- Podman system df documentation: https://docs.podman.io/en/latest/markdown/podman-system-df.1.html
- Podman system prune documentation: https://docs.podman.io/en/stable/markdown/podman-system-prune.1.html

## Issues Found
- The rootless verification section said `podman run ... id` should show a non-root user mapping. By default, rootless Podman can still show `uid=0(root)` inside the container while mapping that container root user to the invoking unprivileged host user. I updated the explanation and added `podman unshare cat /proc/self/uid_map` to verify the mapping directly.
- The `/etc/subuid` and `/etc/subgid` checks used unquoted username grep patterns, which could match partial usernames or regular expression characters. I changed them to anchored checks using `id -un`.
- The socket section was labeled as Docker compatibility but tested the Podman-native Libpod endpoint. I changed the curl test to use the Docker-compatible `/v1.40/info` endpoint and added `systemctl --user start podman.socket` before the request.
- The health check section described `podman system df` as a storage consistency check and repeated it for unused resources. I corrected the wording so `podman system check` is the consistency check, `podman system df` shows disk usage, and `podman system df -v` shows detailed reclaimable space.

## Review Notes
The local review environment did not have Podman installed, so commands were validated against official Podman documentation rather than executed locally. Some examples depend on distribution packaging and host configuration, such as SELinux relabeling with `:Z`, rootless networking helpers, and whether the user systemd socket units are installed.
