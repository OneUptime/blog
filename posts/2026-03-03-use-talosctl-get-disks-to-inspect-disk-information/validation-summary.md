# Validation Summary: How to Use talosctl get disks to Inspect Disk Information

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Talos Linux
- talosctl CLI
- Talos runtime resources
- Talos block storage and disk management
- YAML and JSON command output
- jq

## Sources Consulted
- Talos Disk Layout documentation: https://docs.siderolabs.com/talos/v1.13/configure-your-talos-cluster/storage-and-disk-management/disk-management/layout
- Talos Disk Management Common Configuration documentation: https://docs.siderolabs.com/talos/v1.13/configure-your-talos-cluster/storage-and-disk-management/disk-management/common
- Talos RawVolumeConfig reference: https://docs.siderolabs.com/talos/v1.13/reference/configuration/block/rawvolumeconfig
- Talos CLI reference for `talosctl get`: https://docs.siderolabs.com/talos/v1.13/reference/cli
- Talos insecure mode documentation: https://docs.siderolabs.com/talos/v1.12/configure-your-talos-cluster/system-configuration/insecure
- Talos API reference for `DiskSpec` and `SystemDiskSpec`: https://docs.siderolabs.com/talos/v1.12/reference/api
- Go package reference for Talos block resources: https://pkg.go.dev/github.com/siderolabs/talos/pkg/machinery@v1.13.0/resources/block

## Issues Found
- The table output example omitted current columns such as `READ ONLY`, `TRANSPORT`, `ROTATIONAL`, and `WWID`. Updated the example and field descriptions to match current Talos disk output.
- The YAML example used the old resource type `Disks.runtime.talos.dev` and outdated/camelCase fields such as `busPath`, `subsystem`, and `systemDisk`. Updated it to `Disks.block.talos.dev` and current disk spec fields such as `dev_path`, `pretty_size`, `bus_path`, `sub_system`, `transport`, and `symlinks`.
- The post treated system-disk status as a field on each disk. Current Talos exposes this through the `systemdisk` resource, so the system-disk verification and troubleshooting examples now use `talosctl get systemdisk`.
- The storage configuration selector example used install-disk selector syntax while describing selectors based on current disk resource fields. Replaced it with a current block volume selector expression using `disk.<field>` values from `talosctl get disks -o yaml`.
- The related resource command used `talosctl get mounts`, but current storage docs use `mountstatus` and `mountrequests` resources for mounted volume state. Updated the example to `talosctl get mountstatus`.
- The JSON/jq example tried to read `.id` from `.spec` and referenced the removed `systemDisk` field. Updated it to read the resource ID from `.metadata.id` and current disk fields from `.spec`.

## Review Notes
The command syntax for `talosctl get disks`, `--nodes`, `--insecure`, `-o yaml`, and `-o json` is current. `talosctl get blockdevices` and `talosctl get systemdisk` are valid block resources in the current Talos resource package.
