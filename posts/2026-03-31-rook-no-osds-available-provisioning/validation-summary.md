# Validation Summary: How to Troubleshoot No OSDs Available for Provisioning in Rook

## Status
validated

## Post Type
Troubleshooting Guide

## Technologies Covered
- Rook (Kubernetes storage orchestrator)
- Ceph (distributed storage system)
- Kubernetes (container orchestration)
- Ceph OSD (Object Storage Daemon)

## Sources Consulted
- Rook official documentation — prerequisites for OSD devices (https://rook.io/docs/rook/latest/Getting-Started/Prerequisites/)
- Rook official documentation — cluster teardown and disk cleanup procedure (https://rook.io/docs/rook/latest/Storage-Configuration/ceph-teardown/)
- Rook troubleshooting documentation — pod labels and operator debugging (https://rook.io/docs/rook/latest/Troubleshooting/ceph-common-issues/)
- Ceph documentation — pool size and min_size behavior (https://docs.ceph.com/en/latest/rados/operations/pools/)
- Rook GitHub issue #5127 — min_size not auto-adjusted when size is changed post-creation

## Issues Found

### 1. Incorrect claim about `osdsPerDevice` and partitioned devices
**What was wrong:** The post stated "Rook will not use devices that have existing partitions or filesystems unless `config.osdsPerDevice` and cleanup settings allow it" and included a YAML snippet showing `osdsPerDevice: "1"` as a solution. This is incorrect — `osdsPerDevice` only controls how many OSDs are created per device (useful for NVMe drives), not whether partitioned devices are accepted. Rook requires raw devices with no existing partitions or filesystems; no configuration setting overrides this.
**What was changed:** Replaced the misleading claim and YAML snippet with a correct explanation that devices must be wiped before Rook will use them.

### 2. Insufficient disk wiping commands
**What was wrong:** The post showed `dd if=/dev/zero of=/dev/sdb bs=4096 count=100` which only zeros 400KB — insufficient to clear all Ceph/LVM metadata. It also omitted `sgdisk --zap-all` (needed to clear partition tables) and `partprobe` (to notify the OS of partition table changes).
**What was changed:** Updated the disk wiping procedure to match the Rook-recommended approach: `sgdisk --zap-all`, `dd` with `bs=1M count=100 oflag=direct,dsync`, `wipefs -a`, and `partprobe`.

### 3. Missing `min_size` adjustment when reducing pool size
**What was wrong:** The post showed `ceph osd pool set replicapool size 1` without also setting `min_size`. Ceph does not auto-adjust `min_size` when `size` is changed after pool creation. If a pool was created with size=3 (default min_size=2), setting size=1 without also setting min_size=1 would leave min_size > size, preventing I/O on the pool.
**What was changed:** Added a second command to also set `min_size 1`, and strengthened the warning about data loss risk.

## Review Notes
- The `replicapool` pool name used in examples is a common Rook default but users may have different pool names. This is acceptable for a troubleshooting guide.
- The Rook disk cleanup documentation also recommends `blkdiscard` for SSDs and additional `dd` commands at various seek offsets to clear LVM metadata scattered across the disk. The simplified procedure in the post is sufficient for most cases.
- All kubectl commands, pod labels, and Ceph CLI syntax are correct.
