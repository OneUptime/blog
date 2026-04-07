# Validation Summary: How to Use udev Rules for Ceph Device Management

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- udev (Linux device manager)
- Rook (Ceph operator for Kubernetes)
- Ceph OSD device management
- Kubernetes DaemonSets
- kubectl debug for node-level operations

## Sources Consulted
- Rook documentation: https://rook.io/docs/rook/latest/Getting-Started/quickstart/
- Rook source code (discover daemon implementation using Go udev library)
- udev man pages: udev(7), udevadm(8)
- Kubernetes DaemonSet documentation: https://kubernetes.io/docs/concepts/workloads/controllers/daemonset/
- Linux kernel NVMe device naming conventions

## Issues Found

1. **Incorrect description of Rook's device discovery mechanism**: The post claimed Rook's discover DaemonSet "installs udev rules" at `/etc/udev/rules.d/99-rook.rules` with specific rule content. In reality, Rook's discover daemon monitors udev events programmatically via Go-based udev monitoring, not by installing static rule files. Replaced with accurate description and a command to view discovered devices via the Rook ConfigMap.

2. **DaemonSet uses `busybox` image which lacks `udevadm`**: The DaemonSet example used `busybox` as the container image and called `udevadm control --reload-rules` and `udevadm trigger`, but busybox does not include `udevadm`. Changed the image to `ubuntu:22.04` which includes udev tools.

3. **`udevadm` commands inside container cannot reach host udevd**: Even with `hostPID: true`, running `udevadm` inside the container namespace won't communicate with the host's udev daemon. Fixed by using `nsenter --target 1 --mount --` to enter the host's mount namespace before running udevadm commands, and added `securityContext.privileged: true` to allow nsenter access.

## Review Notes
- The udev rule syntax examples (SUBSYSTEM, KERNEL, ATTRS, SYMLINK+, TAG+) are all correct.
- The kubectl debug node commands for udevadm info/monitor are valid approaches for node-level debugging.
- The Rook CephCluster device specification using `/dev/disk/by-id/` and `/dev/disk/by-path/` paths is correct and recommended practice.
- The NVMe kernel pattern `nvme*n*` will match both whole disks (nvme0n1) and partitions (nvme0n1p1). For OSD use, users may want to be more specific with `nvme*n*[!p*]` or filter partitions, but the current pattern is acceptable for a general example.
