# Validation Summary: How to Monitor Bridge Port States

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Linux bridge (kernel bridge driver)
- iproute2 (`bridge` command, `bridge monitor`)
- bridge-utils (`brctl`)
- Spanning Tree Protocol (STP / IEEE 802.1D)
- sysfs (`/sys/class/net/<bridge>/brif/<port>/state`)
- Forwarding Database (FDB)
- Bash scripting
- Prometheus / node_exporter (textfile collector)
- udev

## Sources Consulted
- Linux kernel header `<linux/if_bridge.h>` — BR_STATE_* enum values
- Linux kernel source `net/bridge/br_sysfs_if.c` and `net/bridge/br_stp.c` — to verify whether sysfs state attribute emits change notifications
- iproute2 `bridge(8)` man page — for `bridge link`, `bridge fdb`, `bridge monitor` subcommands and flags
- `brctl(8)` man page (bridge-utils) — for `brctl showstp` output format
- IEEE 802.1D — STP port state definitions

## Issues Found
- **`inotifywait` on `/sys/class/net/<bridge>/brif/<port>/state` does not detect STP state transitions.** The Linux bridge driver propagates state changes via netlink (and internal RCU updates), not via `sysfs_notify()` on the `state` sysfs attribute, so inotify will not see modify events when STP transitions a port between forwarding/blocking/etc. Replaced the `inotifywait` example with `bridge monitor link`, which is the correct iproute2 tool that subscribes to netlink RTNLGRP_LINK events and reports bridge port state transitions in real time. Also updated the section heading from "Monitoring Port State Changes with inotify" to "Monitoring Port State Changes" so it accurately describes the corrected example.

## Review Notes
- `brctl` is part of the legacy `bridge-utils` package and has been deprecated for years in favor of `ip link` / `bridge` from iproute2. It still works on most distributions, but on minimal/modern systems (e.g. recent Debian/Ubuntu cloud images) `brctl` may not be installed by default. The post uses both `brctl showstp` and the modern `bridge` command, which is reasonable since `bridge` does not currently expose an equivalent of `showstp` for STP timers/topology-change counters.
- The simplified `bridge link show` output in the post omits the interface flags (`<BROADCAST,MULTICAST,UP,LOWER_UP>`) and mtu that the real command emits. This is acceptable for illustration but not byte-identical to actual output.
- The Prometheus textfile collector directory (`/var/lib/prometheus/textfile/`) is configurable via `--collector.textfile.directory` on `node_exporter`; the example assumes a path that is conventional but distribution-specific. Readers should adjust to match their `node_exporter` configuration.
- Linux bridge port state 1 ("listening") is rarely seen with the in-kernel STP because Linux's STP fast-transitions; it's mostly relevant when running `mstpd` or interacting with hardware switches. The post lists it correctly; just worth knowing the practical observation frequency.
