# Validation Summary: How to Use cgroups v2 with Rootless Podman

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Rootless containers
- Linux cgroups v2
- systemd user services and controller delegation
- GRUB kernel command-line configuration

## Sources Consulted
- Podman `podman-run` documentation: https://docs.podman.io/en/v4.4/markdown/podman-run.1.html
- Podman troubleshooting guide, resource limit delegation: https://github.com/containers/podman/blob/main/troubleshooting.md#26-running-containers-with-resource-limits-fails-with-a-permissions-error
- Linux kernel cgroup v2 documentation: https://docs.kernel.org/admin-guide/cgroup-v2.html
- systemd resource-control documentation: https://www.freedesktop.org/software/systemd/man/254/systemd.resource-control.html
- systemd kernel command-line documentation: https://www.freedesktop.org/software/systemd/man/latest/kernel-command-line.html

## Issues Found
- The post checked delegated controllers at `/sys/fs/cgroup/user.slice/user-$(id -u).slice/cgroup.controllers`. Podman's troubleshooting documentation checks the user service cgroup at `/sys/fs/cgroup/user.slice/user-$(id -u).slice/user@$(id -u).service/cgroup.controllers`, so the commands were updated to use the correct path.
- The post recommended restarting `user@$(id -u).service` after adding the systemd drop-in. Podman's documentation says to log out and log back in after creating the drop-in, so the command was changed to reload systemd and then log out/log back in or reboot.
- The post described `systemd.unified_cgroup_hierarchy=1` as the general way to switch from cgroups v1. systemd documents this kernel command-line argument as deprecated in newer systemd releases, though it is still relevant for older distributions, so the wording was narrowed to older systemd-based systems.

## Review Notes
- The Podman resource limit flags used in the examples, including `--cpus`, `--cpu-shares`, `--memory`, `--memory-swap`, `--memory-reservation`, and `--device-read-bps`, are documented Podman options and are not supported on cgroups v1 rootless systems.
- The cgroup v2 files referenced for raw inspection, including `memory.max`, `cpu.max`, and `cgroup.controllers`, match the Linux kernel cgroup v2 interface.
- Podman was not installed in the local workspace environment, so command behavior was verified against official documentation rather than local `podman --help` output.
