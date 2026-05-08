# Validation Summary: How to Configure Volume Options for Rootless Podman

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Rootless containers
- Linux user namespaces
- Bind mounts and named volumes
- SELinux volume labels

## Sources Consulted
- Podman `podman-run(1)` official documentation: https://docs.podman.io/en/latest/markdown/podman-run.1.html
- Podman `podman-volume-create(1)` official documentation: https://docs.podman.io/en/latest/markdown/podman-volume-create.1.html
- Podman upstream rootless tutorial: https://github.com/containers/podman/blob/main/docs/tutorials/rootless_tutorial.md
- `containers-storage.conf(5)` documentation: https://manpages.debian.org/testing/containers-storage/containers-storage.conf.5.en.html

## Issues Found
- The post said the `:U` flag is essential for rootless Podman. Podman documents `:U` as an option that recursively changes source volume ownership, not as a universal requirement. I changed the wording to say it is useful when a volume needs to be owned by the container user.
- The post did not warn that `:U` modifies ownership on the host filesystem. Podman explicitly warns that this operation recursively changes host files. I added that caution to the `:U` explanation.
- The command for resetting permissions back to the host user used `podman unshare chown -R $(id -u):$(id -g)`. Inside Podman's rootless user namespace, namespace UID `0` maps back to the calling host user, so I changed the reset command to `podman unshare chown -R 0:0 /home/user/data` and kept the preceding example as a specific container UID ownership change.

## Review Notes
Podman was not installed in the local environment, so CLI verification via `podman --help` was not possible. Commands and behavior were verified against the current official Podman documentation and upstream rootless tutorial instead.
