# Validation Summary: How to Troubleshoot cgroup Errors in Rootless Podman

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Podman
- Rootless containers
- Linux cgroups v1 and v2
- systemd user services and cgroup delegation
- containers.conf
- GRUB kernel command-line configuration

## Sources Consulted
- Podman global options documentation: https://docs.podman.io/en/v5.3.2/markdown/podman.1.html
- Podman troubleshooting guide: https://github.com/containers/podman/blob/main/troubleshooting.md
- Podman rootless tutorial: https://github.com/containers/podman/blob/main/docs/tutorials/rootless_tutorial.md
- Podman system reset documentation: https://docs.podman.io/en/v5.5.2/markdown/podman-system-reset.1.html
- containers.conf manual page: https://manpages.debian.org/bookworm/golang-github-containers-common/containers.conf.5.en.html
- systemd.resource-control manual page: https://man7.org/linux/man-pages/man5/systemd.resource-control.5.html
- Linux kernel cgroup v2 documentation: https://www.kernel.org/doc/html/latest/admin-guide/cgroup-v2.html
- SUSE rootless Podman documentation: https://documentation.suse.com/smart/container/html/rootless-podman/rootless-podman.html

## Issues Found
- The article checked delegated controllers at `/sys/fs/cgroup/user.slice/user-$(id -u).slice/cgroup.controllers`. Podman troubleshooting examples and systemd's user manager hierarchy place the relevant rootless Podman delegation under `user@$(id -u).service`, so the affected controller and subtree paths were updated.
- The article said an empty `cgroup.controllers` file means delegation is not configured. In practice, the important condition is whether the needed controller is present, so the wording was corrected.
- The article said controller verification "should show" exactly `cpu cpuset io memory pids`. Availability depends on kernel and systemd configuration, so the wording now says the output should include delegated controllers supported by the kernel.
- The Debian/Ubuntu GRUB `sed` command only worked when `GRUB_CMDLINE_LINUX` was empty. It was changed to append the cgroup v2 argument while preserving existing kernel arguments.
- The post implied `podman system reset` is a general last-resort cgroup fix. Official Podman documentation says it removes Podman storage objects, so the summary now warns that it does not fix host cgroup configuration and removes Podman's containers, pods, images, networks, and volumes.
- The opening quote and introduction made overly absolute claims about every cgroup error and exact fixes. These were softened to avoid overclaiming.

## Review Notes
The core guidance is accurate for systemd-based rootless Podman on cgroups v2. Some commands remain distribution-specific, especially `grubby`, `update-grub`, and controller delegation defaults.
