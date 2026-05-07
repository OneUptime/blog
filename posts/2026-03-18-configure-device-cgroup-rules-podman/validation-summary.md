# Validation Summary: How to Configure Device Cgroup Rules in Podman

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Linux cgroups
- Linux device major/minor numbers
- Quadlet systemd units
- SELinux container device access

## Sources Consulted
- Podman `podman run` documentation for `--device-cgroup-rule`: https://docs.podman.io/en/v5.6.1/markdown/podman-run.1.html
- Podman Quadlet / `podman-systemd.unit` documentation for `AddDevice=`, `Volume=`, and `PodmanArgs=`: https://docs.podman.io/en/latest/markdown/podman-systemd.unit.5.html
- Linux kernel cgroup v1 device whitelist controller documentation: https://www.kernel.org/doc/html/latest/admin-guide/cgroup-v1/devices.html
- Linux kernel cgroup v2 documentation for cgroup BPF device handling: https://docs.kernel.org/admin-guide/cgroup-v2.html
- Linux kernel allocated devices documentation: https://www.kernel.org/doc/html/latest/admin-guide/devices.html
- Linux kernel USB serial documentation for ttyUSB major 188: https://docs.kernel.org/6.15/usb/usb-serial.html

## Issues Found
- The device cgroup rule syntax omitted type `a`, which Podman and the Linux device controller support for all devices. Updated the syntax explanation to include `a`.
- The common major-number list described major 189 too broadly as raw USB access. Updated the wording to refer to `/dev/bus/usb` USB device nodes and to recommend checking `/proc/devices`.
- The AMD GPU example hard-coded KFD major 234 even though the post correctly said to find the KFD major number first. Updated the example to derive the major number from `/dev/kfd` with `stat` and use that value in the Podman rule.
- The security example said `c *:* rwm` was effectively the same as `--privileged` for device access. That rule covers all character devices, not all block devices. Updated the wording and added the `a *:* rwm` example for all devices.
- The Quadlet example used `DeviceCgroupRule=`, which is not listed as a current Quadlet container key in the official Podman documentation. Replaced it with repeated `PodmanArgs=--device-cgroup-rule="..."` entries and renamed the section from "Podman Compose / Quadlet" to "Quadlet" because the section does not include a Compose example.

## Review Notes
Podman was not installed in the local workspace, so CLI verification was performed against official Podman documentation rather than local `podman --help` output. Rootless containers may also need `--group-add keep-groups` or equivalent Quadlet configuration when host device access depends on supplementary groups; this is a useful future caveat but not required to correct the current examples.
