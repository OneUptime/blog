# Validation Summary: How to Load the 8021q Kernel Module for VLAN Support

## Status
validated

## Post Type
Guide

## Technologies Covered
- Linux kernel modules
- IEEE 802.1Q VLANs
- `8021q`
- `kmod` / `modprobe`
- `systemd-modules-load`
- `iproute2`

## Sources Consulted
- Linux kernel `net/8021q/Kconfig` (`CONFIG_VLAN_8021Q` is `tristate`, and the module name is `8021q` when built as a module): https://git.kernel.org/pub/scm/linux/kernel/git/torvalds/linux.git/plain/net/8021q/Kconfig
- `modules-load.d(5)` from systemd: https://www.freedesktop.org/software/systemd/man/latest/modules-load.d.html
- `systemd-modules-load.service(8)` from systemd: https://www.freedesktop.org/software/systemd/man/latest/systemd-modules-load.service.html
- `modprobe.d(5)` from kmod: https://man7.org/linux/man-pages/man5/modprobe.d.5.html
- `modules(5)` for `/etc/modules`: https://manpages.debian.org/bookworm/kmod/modules.5.en.html
- `ip-link(8)` VLAN syntax: https://man7.org/linux/man-pages/man8/ip-link.8.html
- Red Hat Enterprise Linux 6 deployment guide note that `8021q` can be loaded as required and may not need separate manual loading: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/6/html/deployment_guide/s2-networkscripts-interfaces_802.1q-vlan-tagging
- Local verification with `modinfo 8021q`, `modinfo -p 8021q`, and `ip link add type vlan help`

## Issues Found
- The introduction and conclusion implied that `8021q` is always required for VLAN support. I corrected this to note that Linux can also have `CONFIG_VLAN_8021Q=y`, in which case VLAN support is built into the kernel and there is no module to load.
- The `lsmod` check could mislead readers into thinking VLAN support is unavailable when no module appears. I added a note that VLAN support may be built into the kernel even if `lsmod` shows no `8021q` entry.
- The `/etc/modprobe.d/8021q.conf` example was technically wrong for boot-time loading. `modprobe.d(5)` is for module parameters, aliases, and related behavior; it does not load a module by itself. I replaced that snippet with an accurate note and a `modinfo -p 8021q` check.
- The troubleshooting section gave distro-specific package advice that was too broad and could be wrong for the running kernel, especially on RHEL-family systems. I changed it to the accurate guidance: if no module file exists, VLAN support may be built into the kernel; otherwise verify or reinstall the kernel modules package for the running kernel.

## Review Notes
- The VLAN creation example using `ip link add link eth0 name eth0.100 type vlan id 100` is correct per `ip-link(8)`.
- On systems where `8021q` is modular, `modprobe` loads listed dependencies automatically. On the reviewed system, `modinfo 8021q` reported dependencies on `mrp` and `garp`.
- `/etc/modules` remains valid on Debian-derived systems, but `modules-load.d` is the more current systemd-native mechanism for static boot-time module loading.
