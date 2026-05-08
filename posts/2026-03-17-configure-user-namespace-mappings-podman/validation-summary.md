# Validation Summary: How to Configure User Namespace Mappings for Podman

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Rootless containers
- Linux user namespaces
- UID and GID mappings
- Subordinate UID/GID ranges

## Sources Consulted
- Podman `podman-unshare(1)` documentation: https://docs.podman.io/en/v3.2.2/markdown/podman-unshare.1.html
- Podman `--uidmap` option documentation: https://docs.podman.io/en/v4.6.1/markdown/options/uidmap.container.html
- Podman `podman-create(1)` UID/GID mapping documentation: https://docs.podman.io/en/v5.2.1/markdown/podman-create.1.html
- Podman `podman-top(1)` documentation: https://docs.podman.io/en/latest/markdown/podman-top.1.html
- Podman `podman-container-inspect(1)` documentation: https://docs.podman.io/en/stable/markdown/podman-container-inspect.1.html
- Linux `user_namespaces(7)` manual page: https://man7.org/linux/man-pages/man7/user_namespaces.7.html

## Issues Found
- The custom namespace size example discussed both subuid and subgid allocations but only updated `/etc/subuid`. Added matching `usermod --del-subgids` and `usermod --add-subgids` commands and updated the comment to say the range provides UIDs and GIDs.
- The inspect examples used `.HostConfig.IDMappings`, which is not a documented `podman container inspect` template placeholder in the current Podman documentation. Replaced it with the documented `.HostConfig.UsernsMode` field and direct reads of `/proc/self/uid_map` and `/proc/self/gid_map` from a running container.
- The security example used `ps aux | grep "sleep 60"` and stated the process shows the username. Replaced it with `podman top sec-test huser,user,pid`, which is the documented Podman way to display host-context and container-context users for container processes.

## Review Notes
The local environment did not have `podman` installed, so commands could not be executed locally. Validation was performed against official Podman documentation and the Linux user namespace manual page.
