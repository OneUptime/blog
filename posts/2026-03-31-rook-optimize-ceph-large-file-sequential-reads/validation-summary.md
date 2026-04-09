# Validation Summary: How to Optimize Ceph for Large File Sequential Reads (ML Training)

## Status
validated

## Post Type
Tutorial / Performance Tuning Guide

## Technologies Covered
- Ceph (distributed storage)
- Rook (Ceph operator for Kubernetes)
- CephFS (Ceph filesystem)
- RBD (RADOS Block Device)
- RADOS (Reliable Autonomic Distributed Object Store)
- fio (Flexible I/O Tester)
- Kubernetes
- Ceph-CSI (Container Storage Interface driver)
- mClock (Ceph QoS scheduler)

## Sources Consulted
- CephFS Client Config Reference (Reef): https://docs.ceph.com/en/reef/cephfs/client-config-ref/
- Ceph OSD Config Reference: https://docs.ceph.com/en/latest/rados/configuration/osd-config-ref/
- Ceph mClock Config Reference (Reef): https://docs.ceph.com/en/reef/rados/configuration/mclock-config-ref/
- Ceph Pools Documentation: https://docs.ceph.com/en/latest/rados/operations/pools/
- rbd man page: https://docs.ceph.com/en/latest/man/8/rbd/
- rados man page: https://docs.ceph.com/en/latest/man/8/rados/
- mount.ceph man page: https://docs.ceph.com/en/reef/man/8/mount.ceph/
- Rook CephFS filesystem-storage docs: https://rook.io/docs/rook/latest-release/Storage-Configuration/Shared-Filesystem-CephFS/filesystem-storage/
- ceph-csi CephFS StorageClass example: https://github.com/ceph/ceph-csi/blob/devel/examples/cephfs/storageclass.yaml

## Issues Found

### 1. Incorrect readahead config option name (Line 42)
- **What was wrong:** The command used `readahead_max_bytes` which is not a valid Ceph config option.
- **What was changed:** Corrected to `client_readahead_max_bytes`, which is the actual Ceph client readahead config key documented in the CephFS client config reference.

### 2. Invalid `stripe_width` pool set command (Lines 57-61)
- **What was wrong:** `stripe_width` is not a settable pool property via `ceph osd pool set`. It is a read-only attribute derived from the erasure code profile. This command would produce an error.
- **What was changed:** Removed the entire `stripe_width` command and its introductory text, as there is no direct equivalent settable property. The remaining RBD `--object-size` command already addresses object size optimization for this use case.

### 3. Non-existent mClock parameter name (Line 79)
- **What was wrong:** `osd_op_queue_mclock_client_read_res` does not exist in any version of Ceph. Ceph mClock does not distinguish between read and write operations at the scheduler level -- it classifies by service type (client, recovery, scrub).
- **What was changed:** Corrected to `osd_mclock_scheduler_client_res`, which is the current (Pacific+) mClock parameter for setting client reservation. Note: this only works when `osd_mclock_profile` is set to `custom`.

### 4. Wrong CephFS mount option for readahead (Line 105)
- **What was wrong:** Used `rsize=4194304` (4MB), which controls the maximum read size per I/O operation (default 16MB). Setting this to 4MB actually *reduces* the max read size from the default and would hurt sequential read performance.
- **What was changed:** Corrected to `rasize=8388608` (8MB). The `rasize` option controls the kernel readahead size for CephFS, which directly impacts sequential read performance. This is the appropriate option for the stated optimization goal.

## Review Notes
- The `objecter_inflight_ops` value of 24576 is technically valid but extremely aggressive (24x the default of 1024). This value was originally chosen as the default for RGW, not general clients. A value in the 2048-8192 range may be more appropriate for ML training clients. Left as-is since it is not incorrect, just aggressive.
- The `rados bench ... seq` command requires previously-written objects from a `write` benchmark run with `--no-cleanup`. The blog does not mention this prerequisite.
- The mClock `osd_mclock_scheduler_client_res` parameter only takes effect when `osd_mclock_profile` is set to `custom`. The blog does not mention this prerequisite.
- The `rbd create --object-size 32M` uses the maximum allowed object size. This is valid but worth noting that 32MB is the upper limit.
