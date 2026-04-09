# Validation Summary: How to Optimize CephFS for Sequential Access Patterns

## Status
validated

## Post Type
Tutorial / Performance Tuning Guide

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph / CephFS (distributed filesystem)
- BlueStore (Ceph OSD backend)
- mClock scheduler (Ceph OSD queue scheduler)
- fio (flexible I/O tester)
- Kubernetes (kubectl, PVCs)

## Sources Consulted
- Ceph official documentation — CephFS Client Config Reference: https://docs.ceph.com/en/latest/cephfs/client-config-ref/
- Ceph source code (src/common/config_opts.h) for `client_readahead_*` option names and defaults
- Linux kernel documentation — sysfs BDI interface: https://www.kernel.org/doc/Documentation/ABI/testing/sysfs-class-bdi
- Ceph documentation — Mount CephFS using Kernel Driver: https://docs.ceph.com/en/latest/cephfs/mount-using-kernel-driver/
- Ceph documentation — `ceph osd perf` command output (commit_latency_ms, apply_latency_ms)
- Rook documentation — Ceph Toolbox: https://rook.io/docs/rook/latest/Troubleshooting/direct-tools/
- Red Hat — OSD performance metrics: https://access.redhat.com/solutions/3661401

## Issues Found

1. **Description references "OSD journal settings" (line 7)**: BlueStore (the current and default Ceph OSD backend) does not use journals — journals were a FileStore concept. Changed to "BlueStore cache settings" to accurately describe what the post covers.

2. **Wrong sysfs path for kernel CephFS readahead (line 29-30)**: The original used `/sys/block/sda/queue/read_ahead_kb`, which is the readahead path for a local block device (e.g., an HDD/SSD). CephFS is a distributed filesystem and does not appear under `/sys/block/`. The correct approach is to use the BDI (Backing Device Info) interface at `/sys/class/bdi/<major>:<minor>/read_ahead_kb`, where the device identifier can be obtained via `mountpoint -d /mnt/cephfs`.

3. **"Increase OSD operation queue size" was misleading (line 57)**: The command `ceph config set osd osd_op_queue mclock_scheduler` changes the queue *scheduler type* to mClock, not the queue *size*. Updated the description to "Configure the OSD operation queue scheduler for better throughput."

4. **`ceph osd perf` described as checking "network bandwidth" (line 69)**: The `ceph osd perf` command outputs OSD commit and apply latency statistics, not network bandwidth metrics. Updated the comment to "Check OSD commit and apply latency to identify slow nodes."

5. **fio benchmark run from rook-ceph-tools pod (line 111)**: The rook-ceph-tools pod does not have CephFS mounted by default — it provides Ceph CLI tools only. Running fio against `/mnt/cephfs/` from this pod would fail. Updated the section to clarify that fio must be run from a pod that has a CephFS PVC mounted, and separated the fio command from the monitoring command (which correctly runs from the tools pod).

## Review Notes
- The `client_readahead_min` option name was verified as correct against Ceph source code (it does NOT have a `_bytes` suffix, unlike what one might expect given `client_readahead_max_bytes`).
- The object layout section sets `object_size` to 32 MB for "1 MB sequential I/O." While the text says "align the object size with your I/O size," using a larger object size (a multiple of the I/O size) is actually a valid strategy to reduce object boundary crossings. The guidance is sound but the framing could be more precise in a future revision.
- The Rook CephCluster network selector YAML uses `provider: host` which is correct for host networking with dedicated interfaces.
- The metadataServer YAML snippet omits a CPU limit under `limits` — this is a valid pattern (setting only memory limits) and not an error.
- The `watch ceph osd perf` monitoring command is fine from the tools pod since it's a Ceph CLI command, not a filesystem operation.
