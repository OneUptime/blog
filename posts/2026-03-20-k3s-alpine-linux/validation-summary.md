# Validation Summary: How to Install K3s on Alpine Linux

## Status
validated

## Post Type
Guide

## Technologies Covered
- K3s
- Kubernetes
- Alpine Linux
- OpenRC
- Linux cgroups
- iptables
- CNI plugins

## Sources Consulted
- K3s Configuration Options: https://docs.k3s.io/installation/configuration
- K3s Advanced Options / Starting the Service with the Installation Script: https://docs.k3s.io/advanced
- K3s Requirements: https://docs.k3s.io/installation/requirements
- K3s Cluster Access: https://docs.k3s.io/cluster-access
- K3s Multus and IPAM plugins: https://docs.k3s.io/networking/multus-ipams
- K3s project README: https://github.com/k3s-io/k3s
- Alpine Linux OpenRC wiki: https://wiki.alpinelinux.org/wiki/OpenRC
- Alpine Linux Iptables wiki: https://wiki.alpinelinux.org/wiki/Iptables
- Alpine Linux package database for `cni-plugins` contents: https://pkgs.alpinelinux.org/contents?arch=x86&branch=edge&name=cni-plugins&repo=community
- BusyBox applet reference: https://busybox.net/BusyBox.html
- Kubernetes swap memory management: https://kubernetes.io/docs/concepts/cluster-administration/swap-memory-management/

## Issues Found
- The post treated musl/glibc compatibility as a core K3s requirement. I removed that requirement because current K3s documentation states that external OS dependencies are minimal and a standard Alpine install does not require a dedicated glibc-compatibility step.
- The version guidance was outdated. I changed the recommendation from Alpine 3.14 and K3s v1.21+ to Alpine 3.19+ and a current stable K3s release so the guide matches current supported behavior and Alpine's cgroup v2 default.
- The cgroup section was inaccurate. It said Alpine may not have cgroup v2 enabled by default, used an invalid `modprobe` invocation for multiple modules, and mixed cgroup v1 and cgroup v2 mount instructions. I replaced that with an OpenRC-aligned setup using `/etc/modules-load.d`, sysctl settings, and the `cgroups` service.
- The server configuration used `hostname -I`, which is not a BusyBox `hostname` option on Alpine. I removed that dynamic `tls-san` block rather than leave a command that would fail on a default Alpine system.
- The post claimed Alpine required a hand-written OpenRC init script for both server and agent nodes. I replaced those sections with the documented current behavior: the `get.k3s.io` installer auto-detects OpenRC, creates the service, enables it, and logs to `/var/log/k3s.log` on server nodes.
- The CNI troubleshooting commands used the wrong Alpine source path and an outdated K3s destination path. I changed the copy step from `/usr/lib/cni` and `/opt/cni/bin` to `/usr/libexec/cni` and `/var/lib/rancher/k3s/data/cni`, which matches current Alpine packaging and current K3s CNI binary layout.
- The iptables troubleshooting text implied legacy iptables was generally required on Alpine. I narrowed that wording so it is clearly conditional on environments that specifically require xtables-legacy.

## Review Notes
- The post is now accurate for current K3s behavior as of 2026-04-29, especially around OpenRC service creation and current CNI binary locations.
- On older or board-specific kernels, K3s may still warn if the memory controller is unavailable; in those cases, bootloader-level cgroup memory settings can still be necessary even though modern Alpine defaults to cgroup v2.
- Disabling swap remains a safe default for K3s installs. Kubernetes now supports configured swap usage on Linux, but the default kubelet behavior is still to fail when swap is enabled unless explicitly configured otherwise.
