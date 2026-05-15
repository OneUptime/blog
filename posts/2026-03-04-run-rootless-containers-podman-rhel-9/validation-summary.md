# Validation Summary: How to Run Rootless Containers with Podman on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Podman rootless containers
- Linux user namespaces and subordinate UID/GID mappings
- containers/storage configuration
- SELinux labeling for container storage and volumes
- Rootless networking with slirp4netns and pasta
- systemd user lingering
- cgroups v2 resource limits

## Sources Consulted
- Red Hat Enterprise Linux 9: Building, running, and managing containers - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/building_running_and_managing_containers/index
- Red Hat Enterprise Linux 9: Communicating among containers - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/htmlsingle/building_running_and_managing_containers/additional_resources
- Podman rootless documentation - https://github.com/containers/podman/blob/main/rootless.md
- Podman rootless tutorial - https://github.com/containers/podman/blob/main/docs/tutorials/rootless_tutorial.md
- Podman top manual - https://docs.podman.io/en/latest/markdown/podman-top.1.html
- containers-storage.conf manual - https://www.mankier.com/5/containers-storage.conf
- usermod(8) manual - https://www.man7.org/linux/man-pages/man8/usermod.8.html
- systemd loginctl manual - https://www.freedesktop.org/software/systemd/man/loginctl.html

## Issues Found

1. **Host process verification command was unreliable.** The original `ps aux | grep -i "ubi-minimal"` might not reliably identify the container process by image name. Replaced it with `podman top -l huser user args`, which uses Podman's documented host-user descriptor.

2. **Custom rootless storage example missed required host preparation.** The original example wrote `graphroot = "/data/containers/storage"` but did not create the path, make it writable by the user, or handle SELinux labels. Added commands to create and chown the path and to apply equivalent SELinux labeling with `semanage fcontext` and `restorecon`.

3. **Networking section conflated backend and network mode.** `podman info --format '{{.Host.NetworkBackend}}'` checks the network backend, not the container's rootless network mode. Renamed that check and added `podman inspect --format '{{.HostConfig.NetworkMode}}' web` for the actual container network mode.

4. **RHEL default rootless network handler was version-specific.** The post said `pasta` is the default on RHEL. Red Hat documents `pasta` as the default starting in RHEL 9.5, with earlier RHEL 9 releases defaulting to `slirp4netns`. Updated the text accordingly.

5. **Resource-limit example depended on a missing tool.** The original command ran `stress-ng` inside `ubi9/ubi-minimal`, but that image does not include `stress-ng` by default. Replaced the command with a simple `sleep 10` workload while preserving the `--memory` and `--cpus` options being demonstrated.

## Review Notes
- The low-port sysctl approach is technically correct, but Red Hat cautions that lowering `net.ipv4.ip_unprivileged_port_start` has security implications and may be inappropriate on production or shared systems.
- Rootless cgroup limits require cgroups v2 and available delegated controllers; the post's cgroup v2 check is correct, but real systems can still vary based on systemd delegation.
