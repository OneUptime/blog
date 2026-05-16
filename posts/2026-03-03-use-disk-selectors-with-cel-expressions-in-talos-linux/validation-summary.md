# Validation Summary: How to Use Disk Selectors with CEL Expressions in Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux
- Talos block volume configuration
- CEL (Common Expression Language)
- `talosctl`
- Kubernetes storage mounts via Talos user volumes

## Sources Consulted
- Talos Linux Disk Management overview: https://www.talos.dev/v1.12/talos-guides/configuration/disk-management/
- Talos Linux Common Configuration / Disk Selector documentation: https://docs.siderolabs.com/talos/v1.12/configure-your-talos-cluster/storage-and-disk-management/disk-management/common
- Talos Linux Disk Layout documentation: https://docs.siderolabs.com/talos/v1.12/configure-your-talos-cluster/storage-and-disk-management/disk-management/layout
- Talos Linux System Volumes documentation: https://docs.siderolabs.com/talos/v1.12/configure-your-talos-cluster/storage-and-disk-management/disk-management/system
- Talos Linux UserVolumeConfig reference: https://docs.siderolabs.com/talos/v1.12/reference/configuration/block/uservolumeconfig
- Talos Linux VolumeConfig reference: https://www.talos.dev/v1.12/reference/configuration/block/volumeconfig/
- Talos Linux CLI reference: https://docs.siderolabs.com/talos/v1.12/reference/cli
- Common Expression Language official site: https://cel.dev/

## Issues Found
- The workload-storage examples used `machine.disks[].deviceSelector.match`, but Talos CEL disk selectors are documented on block volume configuration documents such as `UserVolumeConfig`, `VolumeConfig`, `RawVolumeConfig`, and `SwapVolumeConfig`. Updated the workload examples to use `UserVolumeConfig`.
- The EPHEMERAL example used `machine.volumes`, which is not the documented shape for system volume configuration. Updated it to a `VolumeConfig` document with `kind: VolumeConfig` and `name: EPHEMERAL`.
- Several disk selector field names did not match the documented `Disks.block.talos.dev` resource fields. Replaced `disk.busPath`, `disk.readOnly`, and `disk.systemDisk` with `disk.bus_path`, `disk.readonly`, and `system_disk`.
- The post described `disk.type` values of `ssd` and `hdd`, but the documented disk resource exposes `disk.rotational` for rotational-media detection. Updated SSD examples to use `!disk.rotational` and HDD examples to use `disk.rotational`.
- The attributes list included fields that are not part of the documented disk selector resource context, including `disk.name`, `disk.uuid`, and `disk.subsystem`. Replaced them with documented fields such as `disk.dev_path`, `disk.sub_system`, `disk.cdrom`, `disk.rotational`, and `disk.symlinks`.
- The size constants list used `KB`, which is not documented. Updated the list to use documented binary constants (`KiB`, `MiB`, `GiB`, `TiB`) and decimal constants (`kB`, `MB`, `GB`, `TB`).
- The debugging section used `talosctl disks`, while current Talos documentation recommends `talosctl get disks` for observing disk resources. Updated the command and final summary reference.

## Review Notes
The `system_disk` variable is documented as populated only after Talos installation, so selectors using it may not work during very early installation phases. The corrected examples are aligned with current Talos disk management documentation.
