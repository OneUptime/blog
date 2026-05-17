# Validation Summary: How to Configure Custom Partition Layouts in Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux (machine configuration)
- `talosctl` CLI (apply-config, reboot, get mounts, get blockdevices)
- Kubernetes (PersistentVolume, StorageClass, hostPath, local-path-provisioner)
- LUKS2 disk encryption
- Rook-Ceph (mentioned as a layout pattern)

## Sources Consulted
- [Talos v1.9 Configuration Reference (machine.disks / DiskPartition schema)](https://docs.siderolabs.com/talos/v1.9/reference/configuration/v1alpha1/config/)
- [Talos v1.9 Disk Encryption Guide](https://www.talos.dev/v1.9/talos-guides/configuration/disk-encryption/)
- [Talos v1.11 UserVolumeConfig reference](https://www.talos.dev/v1.11/reference/configuration/block/uservolumeconfig/)
- [Talos v1.12 Disk Layout Guide](https://www.talos.dev/v1.12/talos-guides/configuration/disk-management/layout/)
- [Talos v1.10.0 release notes / `machine.disks` deprecation (siderolabs/talos #10842)](https://github.com/siderolabs/talos/discussions/10842)
- [Adding Disks discussion (siderolabs/talos #9748)](https://github.com/siderolabs/talos/discussions/9748)

## Issues Found
- **Incorrect `encryption` field on `machine.disks[].partitions[]`.** The original "Partition Encryption" section showed an `encryption:` block nested under a partition in `machine.disks`. The `DiskPartition` schema only accepts `size` and `mountpoint` - there is no `encryption` field. The official mechanism for encrypted user partitions on extra disks is `UserVolumeConfig` (added in Talos v1.10). I rewrote the section to use a `UserVolumeConfig` document with `provider: luks2` and `nodeID: {}`, and updated the explanatory text accordingly (mount path is `/var/mnt/<name>`, key derived from node UUID, etc.). All other technical content (system disk layout, `machine.disks` syntax for non-encrypted partitions, `talosctl` commands, Kubernetes PV/hostPath/local-path-provisioner snippets) verified correctly against official docs and was left unchanged.

## Review Notes
- The `machine.disks` schema used throughout this post is **deprecated as of Talos v1.10** in favor of `UserVolumeConfig`, though it remains supported for backwards compatibility. The post does not call this out; a future revision could add a one-line note pointing readers at `UserVolumeConfig` for new deployments. I did not add this because the task brief says to limit changes to fixing technical errors, and the legacy syntax is still functionally correct.
- The system-disk partition list (EFI/BIOS, BOOT, META, STATE, EPHEMERAL) is correct for current Talos versions.
- The byte values for size (e.g. `107374182400` for 100 GiB) are valid - the `DiskSize` type accepts both raw bytes and human-readable forms like `"100 GB"`.
- The Rancher local-path-provisioner `nodePathMap` example is syntactically valid for that project's config schema.
