# Validation Summary: How to List Available Disks in Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux
- talosctl CLI
- Talos COSI resource API (Disk, BlockDevice, DiscoveredVolume resources)
- Kubernetes (DaemonSet, hostPath volume, privileged containers)
- smartctl / smartctl-exporter
- jq (JSON processing)
- Bash scripting

## Sources Consulted
- Talos Linux v1.9 CLI reference: https://docs.siderolabs.com/talos/v1.9/reference/cli/
- Talos Linux v1.7 CLI reference (to confirm `talosctl disks` historical flags): https://docs.siderolabs.com/talos/v1.7/reference/cli/
- Talos Linux v1.8 CLI reference: https://docs.siderolabs.com/talos/v1.8/reference/cli/
- Talos v1.9 disk management guide: https://docs.siderolabs.com/talos/v1.9/configure-your-talos-cluster/storage-and-disk-management/disk-management
- Talos source for block resource types: https://github.com/siderolabs/talos/tree/main/pkg/machinery/resources/block (disk.go, device.go)

## Issues Found

1. **`talosctl disks --output table` flag is invalid** — In the automation script section, the post invoked `talosctl disks --nodes "$node" --output table`. The `talosctl disks` command only exposes two local flags (`-h, --help` and `-i, --insecure`) and does not support `--output`. **Fix:** removed `--output table` from the script — the default (and only) output format for `disks` is the table form already shown.

2. **`talosctl disks -o json | jq` is invalid** — Same root cause: `talosctl disks` has no output-format flag, so piping its output through `jq` as JSON does not work. **Fix:** replaced with `talosctl get disks --nodes 192.168.1.10 -o json | jq ...` and updated the jq expression to use the resource shape (`.metadata.id`, `.spec.size`, `.spec.model`) of the `Disk` resource returned by the COSI resource API, which does support `-o json`.

3. **Misattributed resource contents** — The post claimed `talosctl get blockdevices -o yaml` shows "partition tables if they exist, filesystem types, and mount points," and that `talosctl get disks -o yaml` shows "the current partition table for each disk, including partition sizes, types (like EFI, BIOS boot, Linux filesystem), and labels." Inspecting the source:
   - `Disk` (`Disks.block.talos.dev`) contains only disk-level hardware fields (DevPath, Size, Model, Serial, WWID, Transport, Rotational, etc.), no partition info.
   - `BlockDevice` (`BlockDevices.block.talos.dev`) contains the block device hierarchy and partition name/number, but not filesystem types or mount points.
   - Filesystem types, labels, partition UUIDs, and similar live on the `DiscoveredVolume` resource (`talosctl get discoveredvolumes`).
   
   **Fix:** rewrote both descriptions to be accurate, retitled the section to "Inspecting Disk Partitions and Filesystems," and replaced the `talosctl get disks -o yaml` example with `talosctl get discoveredvolumes --nodes 192.168.1.10 -o yaml`, which is the correct resource for filesystem/partition discovery.

4. **Wrap-up paragraph updated** — Added `get discoveredvolumes` to the list of resource API commands mentioned in the closing paragraph, since the body now references it.

## Review Notes

- The `talosctl disks` command was present and unchanged through Talos v1.7 and v1.8. It is **not present** in the v1.9 CLI reference (the reference enumerates commands and stops before reaching a `disks` entry). The post still presents `disks` as the primary command and shows its legacy column output (DEV, MODEL, SERIAL, ..., SYSTEM_DISK), which is accurate for the versions where the command exists. Readers on Talos v1.9+ may need to use `talosctl get disks` and `talosctl get systemdisks` instead — worth a future version-compatibility note, but the post is not incorrect for the broad version range that still has `disks`.
- The example output for `talosctl disks` uses `GB` rather than the exact human-readable units (`50 GB`, `100 GB`, `500 GB`) Talos formats; this is illustrative and acceptable.
- The DaemonSet YAML example uses a placeholder image (`monitoring/smartctl-exporter:latest`) which is not a canonical published image. The structure (privileged container, `/dev` hostPath mount) is correct for what `smartctl` needs, but readers will need to substitute a real image such as `quay.io/prometheuscommunity/smartctl-exporter`.
- The `talosctl disks --context my-cluster --nodes 192.168.1.10` example is correct — `--context` is a global flag inherited from the root command, so it applies to `disks` even though `disks` doesn't list it among its local flags.
