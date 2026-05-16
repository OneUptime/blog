# Validation Summary: How to Manage Volumes in Talos Linux

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Talos Linux (v1.9+)
- `talosctl` CLI
- Talos machine configuration (v1alpha1)
- Talos Volumes API (`VolumeConfig`, `UserVolumeConfig`, `VolumeStatus`)
- Common Expression Language (CEL) for disk selectors
- XFS filesystem
- Kubernetes (storage layer)

## Sources Consulted
- [Talos Linux v1.9 Disk Management Guide](https://docs.siderolabs.com/talos/v1.9/configure-your-talos-cluster/storage-and-disk-management/disk-management)
- [Talos v1.9 v1alpha1 Configuration Reference](https://docs.siderolabs.com/talos/v1.9/reference/configuration/v1alpha1/config/)
- [UserVolumeConfig reference (Talos v1.10/v1.11)](https://docs.siderolabs.com/talos/v1.10/reference/configuration/block/uservolumeconfig)
- [Sidero Labs docs — Resetting a Machine](https://docs.siderolabs.com/talos/v1.8/configure-your-talos-cluster/lifecycle-management/resetting-a-machine)
- [Talos `talosctl reset` CLI reference](https://docs.siderolabs.com/talos/v1.9/reference/cli/talosctl_reset/)

## Issues Found

1. **Invalid `deviceSelector` under `machine.disks`** — The original post showed a `deviceSelector` block (with `size`, `type`, `busPath`) nested under `machine.disks[]`. The `MachineDisk` schema only supports `device` and `partitions`; it has no `deviceSelector` field. Disk selection by attributes is exposed through the modern Volumes API (`UserVolumeConfig` / `VolumeConfig`) using a CEL `match` expression. Replaced the example with a correct `UserVolumeConfig` document using `diskSelector.match` and documented the actual attributes available on the `disk` CEL object (`disk.size`, `disk.transport`, `disk.model`, etc.).

2. **Invalid `machine.install.ephemeral` block** — The original "Managing the EPHEMERAL Volume" section showed `machine.install.ephemeral.minSize` / `maxSize`. No such fields exist under `machine.install`. EPHEMERAL is configured via a separate `VolumeConfig` document (`apiVersion: v1alpha1`, `kind: VolumeConfig`, `name: EPHEMERAL`). Replaced the example accordingly and corrected the default size description (2 GiB minimum, grows to fill the disk). Also added the documented caveat that volume configuration only applies before provisioning.

3. **Non-existent `talosctl get volumes` command** — Talos has no `volumes` resource. The actual resources are `VolumeConfig` (desired state) and `VolumeStatus` (actual state), queried with `talosctl get volumeconfigs` and `talosctl get volumestatus`. Updated every occurrence across the Monitoring, Lifecycle, Error Handling, and Summary sections.

4. **Lowercased `phase: failed` in grep filter** — Talos VolumeStatus phase values are lowercase (e.g. `ready`, `failed`), so the grep pattern in the error-handling example was updated from `phase: Failed` to `phase: failed`.

## Review Notes
- The `machine.disks` legacy field is still supported in Talos v1.9 for partitioning additional disks via explicit device paths, so the basic, resizing, multiple-volume, and node-role examples remain valid. The post now correctly steers users toward the modern `UserVolumeConfig`/`VolumeConfig` API for anything that needs disk selection. Future revisions could go further and rewrite the multi-volume and node-role sections to use `UserVolumeConfig` documents end-to-end, since `machine.disks` is increasingly considered the older path.
- The "Volume Lifecycle" phase list is conceptual rather than a direct mapping of the Talos VolumeStatus phases (`waiting`, `missing`, `located`, `provisioned`, `prepared`, `ready`, `closed`). It is not technically wrong, but readers tracing this back to `talosctl get volumestatus` output will see different phase strings.
- `talosctl reset --graceful` is correct; `--graceful` is a boolean flag that defaults to `true`. The example is harmless but slightly redundant.
- The default-XFS filesystem claim is consistent with what Talos documentation and `volumestatus` output show.
