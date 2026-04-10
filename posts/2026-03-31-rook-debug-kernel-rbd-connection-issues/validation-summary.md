# Validation Summary: How to Debug Kernel RBD Connection Issues

## Status
validated

## Post Type
Troubleshooting Guide

## Technologies Covered
- Ceph (RADOS Block Device / RBD)
- Rook (Ceph operator for Kubernetes)
- Linux kernel RBD driver (libceph, rbd modules)
- Linux sysfs interface for RBD devices
- Linux dynamic debug (dynamic_debug/control)
- dmesg kernel logging
- Ceph CLI tools (ceph osd, ceph status, rbd)

## Sources Consulted
- Linux kernel RBD sysfs documentation: https://www.kernel.org/doc/Documentation/ABI/testing/sysfs-bus-rbd
- Linux kernel RBD driver source (drivers/block/rbd.c): https://github.com/torvalds/linux/blob/master/drivers/block/rbd.c
- Ceph documentation on monitor ports (v1 msgr port 6789, v2 msgr port 3300): https://docs.ceph.com/en/latest/rados/configuration/network-config-ref/
- Ceph documentation on RBD commands: https://docs.ceph.com/en/latest/rbd/rados-rbd-cmds/
- Ceph documentation on blocklist/blacklist: https://docs.ceph.com/en/latest/rados/operations/add-or-rm-osds/
- Linux dynamic debug documentation: https://www.kernel.org/doc/html/latest/admin-guide/dynamic-debug-howto.html

## Issues Found

### 1. Invalid sysfs attribute `/sys/bus/rbd/devices/0/state`
**What was wrong:** The post referenced `cat /sys/bus/rbd/devices/0/state` as a way to check the state of a mapped RBD device. The `state` attribute does not exist in the kernel RBD sysfs interface. Valid attributes include `pool`, `name`, `client_id`, `major`, `minor`, `size`, `features`, `image_id`, `snap_name`, `client_addr`, etc.

**What was changed:** Replaced the three sysfs cat commands with `pool`, `name`, and `client_id` — attributes that actually exist and are useful for debugging connection issues. `client_id` is particularly relevant as it identifies the Ceph client connection.

### 2. Incorrect `ceph osd dump` parsing with awk
**What was wrong:** The command `ceph osd dump | grep "^osd\." | awk '{print $1, $3}'` was described as extracting OSD names and addresses. However, field `$3` in `ceph osd dump` output is the `in`/`out` status, not the OSD address. The address appears much later in the line.

**What was changed:** Replaced the unreliable awk parsing with `ceph osd find 0`, which reliably returns the address for a specific OSD in clean JSON format.

### 3. Missing `libceph` debug disable
**What was wrong:** The post enabled dynamic debug for both the `rbd` and `libceph` kernel modules but only showed how to disable debug for the `rbd` module, leaving `libceph` in verbose mode.

**What was changed:** Added the corresponding `echo "module libceph -p"` command to the disable section so both modules are cleaned up.

## Review Notes
- The post correctly mentions both the legacy `ceph osd blacklist` command and the newer `ceph osd blocklist` command. The `blacklist` subcommand was deprecated in Ceph Pacific (16.2.x) in favor of `blocklist`. The post handles this well by showing both.
- The common dmesg error messages shown are accurate: `-5` maps to `EIO`, `-111` maps to `ECONNREFUSED`.
- Monitor ports (6789 for v1, 3300 for v2) are correct.
- The dynamic debug syntax for enabling/disabling kernel module debug output is correct.
- The `rbd device map` syntax is correct.
- Keyring permission recommendation (chmod 600) is appropriate.
