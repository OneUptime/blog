# Validation Summary: How to Use talosctl disks to List Available Disks

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux
- talosctl
- Talos disk and volume resources
- Rook-Ceph
- Kubernetes storage
- Shell scripting
- YAML configuration

## Sources Consulted
- Talos Linux v1.12 Disk Layout documentation: https://docs.siderolabs.com/talos/v1.12/configure-your-talos-cluster/storage-and-disk-management/disk-management/layout
- Talos Linux v1.12 CLI reference: https://docs.siderolabs.com/talos/v1.12/reference/cli
- Talos Linux v1.9 release notes, removal of `talosctl disks`: https://docs.siderolabs.com/talos/v1.9/getting-started/what's-new-in-talos
- Talos Linux v1.12 machine configuration reference: https://docs.siderolabs.com/talos/v1.12/reference/configuration/v1alpha1/config
- Rook CephCluster CRD documentation: https://rook.io/docs/rook/latest-release/CRDs/Cluster/ceph-cluster-crd/

## Issues Found
- The post used the removed `talosctl disks` command. Talos v1.9 removed that command and current Talos uses `talosctl get disks`, `talosctl get systemdisk`, and related resource queries. Updated the title, description, prose, and command examples to use `talosctl get disks`.
- The sample `talosctl disks` output had obsolete columns (`DEV`, `BUS`, `SUBSYS`, `TYPE`, `UUID`) that do not match current `talosctl get disks` output. Replaced it with the current table shape (`NODE`, `NAMESPACE`, `TYPE`, `ID`, `SIZE`, `READ ONLY`, `TRANSPORT`, `ROTATIONAL`, `WWID`, `MODEL`, `SERIAL`) and updated the column explanations.
- The post implied disk partition information comes directly from the disk listing. Current Talos exposes partition and volume details through `talosctl get discoveredvolumes`, `talosctl get systemdisk`, and `talosctl get mountstatus`. Updated the relevant examples and explanations.
- The troubleshooting examples used `talosctl cp`, but current Talos documents the command as `talosctl copy`, and `talosctl read` is the simpler supported command for reading `/proc/partitions` and `/proc/diskstats`. Updated those examples to `talosctl read`.
- The Talos machine configuration snippet pinned the installer image to the old `v1.7.0` tag. Replaced it with the documented `ghcr.io/siderolabs/installer:latest` example to avoid recommending an outdated release in a current guide.
- The Rook-Ceph example omitted common required cluster fields. Added `cephVersion`, `dataDirHostPath`, and `mon` fields while preserving the original storage-device selection example.
- The best-practice recommendation to use WWID or UUID was too broad for the current disk output, which exposes WWID and serial but not a UUID column. Updated it to recommend WWID, serial number, or stable `/dev/disk/by-id/` paths.

## Review Notes
The guide is now accurate for current Talos releases. For production Talos machine configs, pinning a specific installer image version that matches the cluster version is usually preferable to `latest`; the post uses `latest` because it is the official generic documentation example and avoids a stale version pin.
