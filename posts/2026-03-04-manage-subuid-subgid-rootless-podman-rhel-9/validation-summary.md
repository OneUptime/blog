# Validation Summary: How to Manage Subuid and Subgid Mappings for Rootless Podman on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Podman rootless containers
- Linux user namespaces
- `/etc/subuid` and `/etc/subgid`
- shadow-utils `usermod`, `newuidmap`, and `newgidmap`

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Building, running, and managing containers": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/building_running_and_managing_containers/index
- Podman rootless mode documentation: https://docs.podman.io/en/v4.3/markdown/podman.1.html
- Podman `podman-system-migrate(1)` documentation: https://docs.podman.io/en/v3.2.2/markdown/podman-system-migrate.1.html
- Podman `podman-system-reset(1)` documentation: https://docs.podman.io/en/v5.5.2/markdown/podman-system-reset.1.html
- Podman `podman-info(1)` documentation: https://docs.podman.io/en/stable/markdown/podman-info.1.html
- shadow-utils `subuid(5)` manual page: https://man7.org/linux/man-pages/man5/subuid.5.html
- shadow-utils `usermod(8)` manual page: https://man7.org/linux/man-pages/man8/usermod.8.html
- shadow-utils `newuidmap(1)` manual page: https://man7.org/linux/man-pages/man1/newuidmap.1.html

## Issues Found
- The post described `podman system migrate` as migrating Podman storage after subuid/subgid changes. Podman documentation describes this command as stopping rootless containers and the pause process so namespace mapping changes can take effect, so the wording was corrected.
- The `podman system reset` description only mentioned containers, images, and volumes. Podman documentation also lists pods, networks, build cache, and other storage-related data, so the description was expanded.
- The larger-range example used `--add-subuids 100000-262143` and `--add-subgids 100000-262143` after earlier examples had already assigned `100000-165535`, which would create overlapping ranges for the same user. The example was corrected to remove the old range before adding the larger range.
- The troubleshooting `grep $(whoami)` command could match partial names or unintended regular expression text. It was changed to `grep "^$(id -un):"` to check the current user's mapping entry more directly.

## Review Notes
The post is technically relevant and the core guidance matches Red Hat and Podman documentation. The examples assume local file-based subordinate ID delegation through `/etc/subuid` and `/etc/subgid`; environments using NSS subid plugins or centralized identity management may require different operational steps.
