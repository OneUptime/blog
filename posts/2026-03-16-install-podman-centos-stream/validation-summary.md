# Validation Summary: How to Install Podman on CentOS Stream

## Status
validated

## Post Type
Tutorial / Installation guide

## Technologies Covered
- Podman
- CentOS Stream 8 and 9
- DNF package management and modules
- Rootless containers
- systemd user and system sockets
- firewalld
- SELinux container volume labels
- Buildah
- Skopeo

## Sources Consulted
- Red Hat Enterprise Linux 9 container tools documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/htmlsingle/building_running_and_managing_containers/
- Red Hat Enterprise Linux 8 container tools documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/htmlsingle/building_running_and_managing_containers/
- CentOS Stream 8 container-tools module metadata: https://git.centos.org/modules/container-tools/blob/c8s-stream-rhel8/f/container-tools.yaml
- CentOS Stream 8 EOL announcement: https://lists.centos.org/hyperkitty/list/announce@lists.centos.org/thread/DS7Q6NQWYD3YXCECJPSAXFFSRSDIJG2Q/
- Podman rootless mode documentation: https://docs.podman.io/en/latest/markdown/podman.1.html
- Podman system service documentation: https://docs.podman.io/en/latest/markdown/podman-system-service.1.html
- Podman system migrate documentation: https://docs.podman.io/en/latest/markdown/podman-system-migrate.1.html
- Podman run volume and SELinux labeling documentation: https://docs.podman.io/en/latest/markdown/podman-run.1.html

## Issues Found
- The post presented CentOS Stream 8 as a normal supported target. CentOS Stream 8 reached end of life on May 31, 2024, and its normal DNF/YUM repositories were expected to break after content moved to vault.centos.org. Updated the description, prerequisites, introduction, and CentOS Stream 8 install note to make CentOS Stream 8 clearly legacy.
- The troubleshooting section recommended `podman system reset` after changing subordinate UID/GID mappings. Podman documentation recommends `podman system migrate` to stop the rootless pause process and recreate the namespace with updated `/etc/subuid` and `/etc/subgid` mappings. Replaced the reset command with `podman system migrate`.

## Review Notes
- The remaining installation, verification, rootless setup, socket activation, firewall, Nginx example, Buildah/Skopeo installation, and SELinux `:Z` volume-label examples are technically consistent with official Red Hat and Podman documentation.
- CentOS Stream 10 is also current in 2026, but the post specifically targets CentOS Stream 9 with legacy CentOS Stream 8 notes, so no CentOS Stream 10 section was added.
