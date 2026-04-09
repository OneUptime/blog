# Validation Summary: How to Handle Network Disconnections Causing Mount Failures in Ceph

## Status
validated

## Post Type
Troubleshooting Guide

## Technologies Covered
- Ceph (kernel RBD client, CephFS kernel client)
- Rook-Ceph (Kubernetes operator)
- Linux kernel debugfs and sysfs interfaces
- Kubernetes CSI (Container Storage Interface) volumes
- kubectl CLI

## Sources Consulted
- Linux Kernel ABI documentation for sysfs-bus-rbd: https://www.kernel.org/doc/Documentation/ABI/testing/sysfs-bus-rbd
- Linux kernel rbd.c source (module_param definitions): https://github.com/torvalds/linux/blob/master/drivers/block/rbd.c
- Ceph kernel debugfs.c source (debugfs file names): net/ceph/debugfs.c in the Linux kernel tree
- Ceph mount.ceph(8) man page: https://docs.ceph.com/en/latest/man/8/mount.ceph/
- CephFS mount using kernel driver documentation: https://docs.ceph.com/en/latest/cephfs/mount-using-kernel-driver/
- Linux kernel CephFS documentation: https://www.kernel.org/doc/html/v6.12/filesystems/ceph.html
- Ceph RBD man page (krbd options): https://docs.ceph.com/en/latest/man/8/rbd/
- Ceph tracker issue #23073: osd_request_timeout for rbd map

## Issues Found

### 1. Incorrect Ceph debugfs path: `osds` does not exist
**What was wrong:** The post referenced `/sys/kernel/debug/ceph/*/osds` in two places. This file does not exist in the kernel Ceph debugfs.
**What was changed:** Changed to `/sys/kernel/debug/ceph/*/osdc` (OSD client status, for diagnosing active requests) in the diagnostic section, and `/sys/kernel/debug/ceph/*/osdmap` (OSD map, for verifying map currency) in the recovery verification section.
**Why:** The kernel Ceph debugfs creates files named `osdc`, `osdmap`, `monc`, `monmap`, and `client_options` — there is no `osds` file.

### 2. Non-existent RBD sysfs `timeout` attribute and module parameter
**What was wrong:** The post claimed you could read/write `/sys/bus/rbd/devices/0/timeout` and set `options rbd timeout=60` as a modprobe option. Neither exists — the `rbd` kernel module's only module parameter is `single_major`, and the sysfs attributes for RBD devices do not include `timeout`.
**What was changed:** Replaced with the correct approach: using `rbd map -o osd_request_timeout=60` when mapping devices, or setting `osd_request_timeout` in `/etc/ceph/ceph.conf` under the `[client]` section.
**Why:** The `osd_request_timeout` is a libceph option that controls how long the OSD client waits before returning I/O errors, and it must be set at map time (not via sysfs or modprobe).

### 3. Inaccurate description of `recover_session=clean`
**What was wrong:** The comment described `recover_session=clean` as "safer, reconnects after split-brain." This is inaccurate on both counts — the option reconnects after the client is **blocklisted** (evicted by the MDS), not after split-brain. It also drops dirty data and metadata during reconnection, so calling it "safer" is misleading.
**What was changed:** Updated the comment to "reconnects after client blocklisting, drops dirty state."
**Why:** Per the official mount.ceph(8) man page, `recover_session=clean` causes the client to reconnect when it detects blocklisting, dropping dirty data/metadata and invalidating caches. The default `recover_session=no` never attempts reconnection after blocklisting.

### 4. Invalid RBD timeout configuration in prevention section
**What was wrong:** The prevention section repeated the incorrect `options rbd timeout=30` modprobe approach and `modprobe -r rbd && modprobe rbd` reload pattern.
**What was changed:** Replaced with the correct `osd_request_timeout` approach via ceph.conf or `rbd map -o` options.
**Why:** Same root cause as issue #2.

## Review Notes
- The CephFS mount syntax uses the older device-string format (`mon1:6789,mon2:6789:/`). Newer kernels (5.11+) support a new mount API syntax (`user@fsid.fs_name=/ -o mon_addr=...`). The old syntax still works but is considered legacy. Not changed since it remains functional.
- The `recover_session=no` is described as an alternative, but it is actually the **default** value. The post could be clearer about this.
- The VolumeAttachment grep for `my-pvc` may not always match since VolumeAttachments reference PV names, not PVC names. However, with dynamic provisioning the PV name often contains PVC information, so this is a reasonable troubleshooting heuristic.
