# Validation Summary: How to Set DmClock Limits for Ceph Client Throttling

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ceph (mClock QoS scheduler)
- Rook-Ceph (Kubernetes operator)
- Ceph CSI RBD driver (StorageClass-based QoS)
- RBD (RADOS Block Device) image-level QoS
- fio (Flexible I/O Tester)
- Kubernetes StorageClass

## Sources Consulted
- Ceph mClock Config Reference: https://docs.ceph.com/en/latest/rados/configuration/mclock-config-ref/
- Proxmox Ceph mClock Tuning wiki: https://pve.proxmox.com/wiki/Ceph_mClock_Tuning
- Ceph RBD Config Reference (rbd_qos_* options): https://docs.ceph.com/en/latest/rbd/rbd-config-ref/
- Ceph RBD man page (`rbd config image` subcommands): https://github.com/ceph/ceph/blob/main/doc/man/8/rbd.rst
- Ceph CSI example StorageClass: https://github.com/ceph/ceph-csi/blob/devel/examples/rbd/storageclass.yaml
- Ceph CSI QoS PR #4089: https://github.com/ceph/ceph-csi/pull/4089
- fio documentation: https://fio.readthedocs.io/en/latest/fio_doc.html

## Issues Found

### 1. mClock config values used absolute IOPS instead of fractions
**What was wrong:** The blog set mClock `_lim` values as absolute IOPS numbers (e.g., `2000`, `500`, `300`, `8000`). Since Ceph Quincy 17.2.7 and Reef 18.2.0, mClock `_res` and `_lim` values are fractions (0.0–1.0) of the OSD's maximum IOPS capacity.
**What was changed:** Updated all mClock limit values to fractional values (e.g., `0.5`, `0.25`, `0.1`, `0.3`, `0.8`) and updated comments to explain they represent a fraction of OSD max capacity. Added a note explaining the version-dependent behavior and the `osd_mclock_max_capacity_iops_hdd`/`osd_mclock_max_capacity_iops_ssd` parameters.

### 2. Incorrect `rbd config image get` command
**What was wrong:** The blog used `rbd config image get vms/vm-noisy | grep qos` to list all QoS settings. The `get` subcommand requires a specific key name and cannot list all overrides.
**What was changed:** Changed `get` to `list` — `rbd config image list vms/vm-noisy | grep qos` correctly lists all image-level config overrides.

### 3. Incorrect Ceph CSI StorageClass QoS parameter names
**What was wrong:** The blog used `qosIOPSLimit` and `qosBPSLimit` as StorageClass parameters. These are not valid Ceph CSI parameters. The correct parameter names (per ceph-csi PR #4089) are `maxIops` and `maxBps`.
**What was changed:** Replaced `qosIOPSLimit` with `maxIops` and `qosBPSLimit` with `maxBps`. Added `mounter: rbd-nbd` since these QoS parameters currently only work with the rbd-nbd mounter.

### 4. Non-existent `dump_mclock_queue` admin socket command
**What was wrong:** The blog used `ceph daemon osd.0 dump_mclock_queue`, which is not a valid Ceph admin socket command.
**What was changed:** Replaced with `ceph daemon osd.0 dump_ops_in_flight`, which is a real admin socket command for inspecting active OSD operations.

### 5. fio command missing critical flags for block device testing
**What was wrong:** The fio command lacked `--direct=1` and `--ioengine=libaio`. Without `--direct=1`, I/O goes through the page cache, masking actual device-level QoS enforcement. Without `--ioengine=libaio`, fio defaults to synchronous `psync`, which effectively ignores `--iodepth=64`.
**What was changed:** Added `--ioengine=libaio` and `--direct=1` to the fio command.

## Review Notes
- The RBD QoS option names (`rbd_qos_iops_limit`, `rbd_qos_read_iops_limit`, `rbd_qos_write_iops_limit`, `rbd_qos_bps_limit`) and the `rbd config image set` syntax are correct.
- The mClock config option **names** (`osd_mclock_scheduler_client_lim`, etc.) are correct; only the **values** were wrong.
- The DmClock conceptual explanation (reservations, weights, limits) is accurate.
- The Ceph CSI StorageClass QoS feature (`maxIops`/`maxBps`) currently only supports the `rbd-nbd` mounter, not the default kernel RBD mounter. This is an important caveat for production use.
