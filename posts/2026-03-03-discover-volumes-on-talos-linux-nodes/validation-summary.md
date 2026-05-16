# Validation Summary: How to Discover Volumes on Talos Linux Nodes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux
- talosctl CLI
- Talos COSI resources (VolumeStatus, VolumeConfig, Disk, DiscoveredVolume)
- Kubernetes-oriented storage (EPHEMERAL, STATE, EFI, META, BOOT system volumes)

## Sources Consulted
- Talos Linux Disk Management overview: https://docs.siderolabs.com/talos/v1.12/configure-your-talos-cluster/storage-and-disk-management/disk-management/
- Talos v1.10 Disk Management guide: https://docs.siderolabs.com/talos/v1.10/configure-your-talos-cluster/storage-and-disk-management/disk-management
- Existing Volumes documentation: https://docs.siderolabs.com/talos/v1.12/configure-your-talos-cluster/storage-and-disk-management/disk-management/existing/
- VolumeConfig reference: https://docs.siderolabs.com/talos/v1.13/reference/configuration/block/volumeconfig
- Talos source: `pkg/machinery/resources/block/volume_status.go` (VolumeStatusType = `VolumeStatuses.block.talos.dev`)
- Talos source: `pkg/machinery/resources/block/volume_config.go` (VolumeConfigType = `VolumeConfigs.block.talos.dev`)
- Talos source: `pkg/machinery/resources/block/volumephase.go` (canonical phase list)
- Talos source: `pkg/machinery/resources/block/volume_lifecycle.go` (confirms VolumeLifecycle is an internal singleton with an empty spec)
- Talos source: `cmd/talosctl/cmd/talos/disks.go` (confirms `talosctl disks` is deprecated in favor of `talosctl get disks` / `get systemdisk` / `get discoveredvolumes`)
- Talos documentation index: https://docs.siderolabs.com/llms.txt

## Issues Found

1. **Wrong resource name `talosctl get volumes` used throughout.** Talos does not have a `Volume` resource; the runtime state resource is `VolumeStatus` (`VolumeStatuses.block.talos.dev`) and the configuration resource is `VolumeConfig`. Replaced every `talosctl get volumes` invocation (intro listing, YAML output, multi-node, script, watch, custom-volumes section, summary) with `talosctl get volumestatus`.

2. **Incorrect table output format.** The original showed columns `NODE NAMESPACE TYPE ID VERSION PHASE LOCATION SIZE` and `Volume` in the TYPE column. The actual VolumeStatus PrintColumns (defined in `volume_status.go`) include a second TYPE column (partition/overlay/directory/symlink) before PHASE, and the TYPE column shows `VolumeStatus`. Rewrote the example output to match.

3. **Phase values were title-cased and incomplete.** The post listed only Ready/Waiting/Missing/Failed in title case. The actual enum values in `volumephase.go` are lowercase: `waiting`, `failed`, `missing`, `located`, `provisioned`, `prepared`, `ready`, `closed`. Updated the list and lowercased all phase references in the troubleshooting section.

4. **Invalid YAML example.** The sample YAML used `type: Volumes.talos.dev` and mixed `VolumeConfig` fields (`locator`, `provisioning.diskSelector`, `partitionSpec`, `filesystemSpec`) with a separate `status:` block — this does not match either VolumeConfig or VolumeStatus. Replaced with a realistic VolumeStatus YAML using the correct type string `VolumeStatuses.block.talos.dev` and the actual spec fields (`phase`, `type`, `location`, `mountLocation`, `partitionIndex`, `parentLocation`, `uuid`, `partitionUUID`, `size`, `prettySize`, `filesystem`).

5. **`talosctl get volumelifecycle` misused.** VolumeLifecycle is a singleton internal resource (its spec is empty; the controller uses it as a teardown finalizer signal). It cannot be used to trace volume dependencies. Replaced the "Understanding Volume Dependencies" command with an inspection of `parentID`/`parentLocation` fields on `VolumeStatus`, which is the actual dependency-tracking mechanism.

6. **Non-existent `talosctl get blockdevices` resource.** There is no `blockdevices` (or `BlockDevice`) Talos resource. Replaced with `talosctl get discoveredvolumes`, which is the documented way to enumerate detected block devices, partitions, and filesystems.

7. **Deprecated `talosctl disks` command in troubleshooting.** The standalone `talosctl disks` subcommand is marked hidden and returns an error advising to use `talosctl get disks`, `talosctl get systemdisk`, or `talosctl get discoveredvolumes`. Updated the troubleshooting step accordingly.

8. **Discovering Volume Configurations section.** Added the `talosctl get volumeconfig` command (which is what the section title actually describes) before falling back to `machineconfig`. Also corrected the description of where volume settings live in the config: `machine.install.disk`/`machine.install.diskSelector` plus the `UserVolumeConfig`/`RawVolumeConfig`/`ExistingVolumeConfig` documents, rather than the misleading `machine.disks` claim.

9. **jq filter for NDJSON output.** Changed `jq -r '.[].spec.addresses[0]'` to `jq -r '.spec.addresses[0]'`. `talosctl get … -o json` emits newline-delimited JSON (one object per line), not a JSON array, so the `.[]` index would fail.

10. **Custom volume ID prefixes.** Added the documented prefix scheme (`u-` for UserVolumeConfig, `r-` for RawVolumeConfig, `e-` for ExistingVolumeConfig) so readers can recognize custom volumes in the output.

## Review Notes

- The post does not declare a specific Talos version. The corrections target the current Talos resource API (v1.10+ where `discoveredvolumes`, `volumestatus`, and `volumeconfig` are the canonical resources). Behavior on pre-1.8 versions will differ.
- `VolumeConfig` currently supports only the `STATE`, `EPHEMERAL`, and `IMAGE-CACHE` system volumes; BOOT/EFI/META are managed automatically and surfaced via `VolumeStatus`/`DiscoveredVolume` rather than via user-editable VolumeConfig documents. The post's listing of these as "key volumes you will encounter" is accurate as a discoverability claim and was left intact.
- The Talos Dashboard section is correct; `talosctl dashboard --nodes <ip>` is the documented invocation.
