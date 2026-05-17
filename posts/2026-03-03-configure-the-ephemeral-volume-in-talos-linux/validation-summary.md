# Validation Summary: How to Configure the EPHEMERAL Volume in Talos Linux

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Talos Linux (system volume configuration)
- Kubernetes (kubelet, container runtime, emptyDir, etcd)
- containerd
- XFS / ext4 filesystems
- CEL (Common Expression Language) disk selectors
- talosctl CLI
- Prometheus alerting

## Sources Consulted
- Talos Linux Disk Management overview: https://docs.siderolabs.com/talos/v1.12/configure-your-talos-cluster/storage-and-disk-management/disk-management/
- Talos Linux System Volumes (EPHEMERAL examples): https://docs.siderolabs.com/talos/v1.12/configure-your-talos-cluster/storage-and-disk-management/disk-management/system
- Talos VolumeConfig reference (v1alpha1): https://docs.siderolabs.com/talos/v1.11/reference/configuration/block/volumeconfig
- Talos disk selector / CEL expression docs (Common Configuration): https://docs.siderolabs.com/talos/v1.12/configure-your-talos-cluster/storage-and-disk-management/disk-management/common
- Talos machine config (v1alpha1 `machine` section): https://docs.siderolabs.com/talos/v1.11/reference/configuration/v1alpha1/config
- `talosctl get volumestatus` usage (cross-referenced via search and existing Talos docs)

## Issues Found

1. **Wrong configuration schema (machine.volumes does not exist).** The original post placed EPHEMERAL configuration under `machine.volumes:` in the v1alpha1 machine config. The Talos `machine` section has no `volumes` field. System volumes are configured by appending a separate YAML document with `apiVersion: v1alpha1`, `kind: VolumeConfig`, and `name: EPHEMERAL`. Rewrote every YAML block in the post to use this `VolumeConfig` document form.

2. **Wrong disk selector field name (`disk.type`).** The original used `disk.type == "nvme"` to select NVMe disks. The Talos disk-selector CEL schema has no `type` field; the correct field is `disk.transport` (values include `nvme`, `scsi`, etc.). Changed all occurrences to `disk.transport == 'nvme'`. For the NVMe-on-separate-disk example I also added `&& !system_disk` so the selector does not match the install disk, matching the official example.

3. **Wrong disk selector field name (`disk.busPath`).** Talos exposes this attribute as snake_case `disk.bus_path`, not camelCase `disk.busPath`. Updated the selector accordingly.

4. **Invalid size unit (`200u * GB`).** The size-comparison example used `disk.size >= 200u * GB`. While both decimal and binary multipliers exist in the CEL helpers, the documented and idiomatic form for these comparisons is the binary `GiB`/`TiB` (e.g. `disk.size < 2u * TiB`). Changed to `disk.size >= 200u * GiB` for consistency with the official examples.

5. **Nonexistent `filesystemSpec` field.** The original post showed `provisioning.filesystemSpec.type: xfs` and `label: EPHEMERAL` and claimed users can pick XFS vs ext4 for the EPHEMERAL volume. `VolumeConfig.provisioning` only defines `diskSelector`, `grow`, `minSize`, and `maxSize` — there is no `filesystemSpec` and no way to change the filesystem of system volumes via this document. Rewrote the "Filesystem Options" section (renamed to "Filesystem") to accurately state that XFS is used by Talos for the EPHEMERAL volume and that users who need a different filesystem should provision a separate user volume instead.

6. **`minSize`/`maxSize` size units normalized.** Updated `50GB`/`200GB` literals in the configuration snippets to `50GiB`/`200GiB` to match the units shown in the official VolumeConfig examples. Left the prose sizing guidance ("20-50GB", etc.) alone since that is informal capacity guidance rather than a literal config value.

7. **Stray `machine.install.disk` in volume snippets.** The original Size Constraints and Separate Disk examples mixed `machine.install.disk: /dev/sda` into the same block as a fake `machine.volumes:` list. Since the corrected `VolumeConfig` is a standalone document, the install-disk snippet was removed from those examples to avoid implying the two must be combined in one block.

## Review Notes
- The descriptive claims in the post (EPHEMERAL is mounted at `/var`; it holds container images, writable layers, pod logs, emptyDir, kubelet state, CNI state, etcd data on control plane; default is the last partition on the system disk with XFS) all check out against the Talos documentation.
- `talosctl get volumestatus EPHEMERAL --nodes <ip>` is a valid command; the `VolumeStatus` resource is exposed by talosctl and includes EPHEMERAL.
- Talos `VolumeConfig` is still marked `v1alpha1`; the schema is stable but reviewers updating this post for newer Talos releases should re-check the field list (notably whether a user-facing filesystem field is later added to system volumes).
- The Prometheus alert rule uses standard `node_exporter` filesystem metrics and is correct as written, assuming node_exporter is scraping the Talos nodes.
- The sizing-by-cluster-size guidance is opinion/rule-of-thumb rather than a documented Talos limit, so it was left unchanged.
