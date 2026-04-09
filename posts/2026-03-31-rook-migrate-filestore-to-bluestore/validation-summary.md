# Validation Summary: How to Migrate OSDs from FileStore to BlueStore

## Status
validated

## Post Type
Tutorial / Step-by-step Guide

## Technologies Covered
- Ceph (OSD management, FileStore, BlueStore)
- Rook (Ceph operator for Kubernetes)
- Kubernetes (kubectl, Jobs, Deployments)

## Sources Consulted
- Ceph official documentation on BlueStore: https://docs.ceph.com/en/latest/rados/configuration/bluestore-config-ref/
- Ceph official documentation on OSD management: https://docs.ceph.com/en/latest/rados/operations/add-or-rm-osds/
- Rook documentation on OSD management: https://rook.io/docs/rook/latest/Storage-Configuration/Advanced/ceph-osd-mgmt/
- Ceph Luminous release notes (BlueStore introduction): https://docs.ceph.com/en/latest/releases/luminous/
- Ceph Nautilus release notes (FileStore deprecation): https://docs.ceph.com/en/latest/releases/nautilus/

## Issues Found

1. **Overstated BlueStore performance claim**: The post claimed "2x write performance improvement" for BlueStore over FileStore. Ceph documentation and benchmarks typically cite 20-30% improvement for typical workloads. The 2x figure may apply to narrow synthetic benchmarks (small random writes where FileStore's double-write penalty is most pronounced) but is misleading as a general claim. Changed to "significant write performance improvements (20-30%+ depending on workload)."

2. **`watch` command not reliably available in toolbox container**: The post used `watch ceph status` inside a kubectl exec to the Rook toolbox container. The `watch` utility (from `procps-ng`) is not guaranteed to be present in all versions of the Rook Ceph toolbox image. Replaced with `ceph -w`, which is a built-in Ceph command that provides a continuous watch of cluster status and is always available.

3. **Insufficient disk wipe procedure**: The post used only `dd if=/dev/zero of=/dev/sdX bs=1M count=100`, which zeroes only the first 100MB of the disk. This is insufficient for Rook's `ceph-volume` to consider the disk clean, because LVM metadata, GPT backup headers, and filesystem signatures may reside elsewhere on the disk. Added `wipefs -a` (removes all filesystem/RAID signatures) and `sgdisk --zap-all` (removes GPT and MBR partition tables) before the `dd` command. Also changed the container image from `busybox` to `rook/ceph:master` since `busybox` does not include `wipefs` or `sgdisk`.

## Review Notes
- The post correctly describes the overall migration strategy (remove OSD one at a time, let Ceph rebalance, wipe disk, let Rook reprovision as BlueStore).
- The auto-provisioning behavior described in Step 4 depends on the `CephCluster` CR having `useAllDevices: true` or the specific disk listed in the storage configuration. This is the common case but could be noted for completeness.
- FileStore support was fully removed in Ceph Reef (v18.2.x), so this migration guide is primarily relevant for clusters running Nautilus through Quincy.
- The `ceph osd purge` command and `ceph osd out` syntax are both correct.
