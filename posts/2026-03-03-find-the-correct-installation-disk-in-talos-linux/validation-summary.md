# Validation Summary: How to Find the Correct Installation Disk in Talos Linux

## Status
validated

## Post Type
Tutorial / How-to Guide

## Technologies Covered
- Talos Linux (v1.7 referenced in installer image example)
- talosctl CLI
- Kubernetes (etcd, control plane vs worker nodes)
- Linux block device naming (`/dev/sda`, `/dev/nvme0n1`, `/dev/disk/by-id`)
- YAML machine configuration (`machine.install`, `machine.disks`)
- Ceph (mentioned for distributed storage)

## Sources Consulted
- [Talos v1.7 Configuration Reference](https://docs.siderolabs.com/talos/v1.7/reference/configuration/v1alpha1/config/) — for `InstallDiskSelector` schema and supported fields
- [Talos v1.8 Configuration Reference](https://docs.siderolabs.com/talos/v1.8/reference/configuration/v1alpha1/config/) — to cross-check the `InstallDiskSelector` field set
- [Talos v1.7 CLI Reference](https://docs.siderolabs.com/talos/v1.7/reference/cli/) — to validate `talosctl get` / `talosctl mounts` / `talosctl disks`
- [Talos v1.9 Disk Management Guide](https://docs.siderolabs.com/talos/v1.9/configure-your-talos-cluster/storage-and-disk-management/disk-management) — for context on the newer CEL-based selectors
- [Talos v1.10 Disk Management Guide](https://docs.siderolabs.com/talos/v1.10/configure-your-talos-cluster/storage-and-disk-management/disk-management) — to confirm the CEL-based volume selector vs the legacy `machine.install.diskSelector`
- [siderolabs/talos issue #11255 — "More flexible disk selector for install disk"](https://github.com/siderolabs/talos/issues/11255) — confirms the legacy install diskSelector lacks ordering/match semantics

## Issues Found

1. **Invalid `match: smallest` field in diskSelector example.** The original post showed an example using `match: smallest` under `machine.install.diskSelector`. The `InstallDiskSelector` schema in Talos v1.7/v1.8 only supports the fields `size`, `name`, `model`, `serial`, `modalias`, `uuid`, `wwid`, `type`, and `busPath` — there is no `match` field, and no "smallest" selection semantic is exposed. Applying that config would either be rejected by validation or silently ignored. **Fix:** Replaced the example with a valid one combining `size` and `type` (`size: '>= 50GB'` + `type: ssd`), which is the supported way to narrow disk selection in the legacy selector.

2. **Incorrect resource name in verification step (`talosctl get mounts`).** The correct resource name in Talos is `MountStatus`, so the proper command is `talosctl get mountstatus`. (The standalone `talosctl mounts` command also exists, but it is not a `get`-style resource call.) **Fix:** Changed `talosctl get mounts --nodes 192.168.1.10` to `talosctl get mountstatus --nodes 192.168.1.10`, and updated the surrounding sentence ("The mounts output…" → "The mount status output…").

## Review Notes

- The example output for `talosctl get disks` shows a simplified column set (NODE, NAMESPACE, TYPE, ID, VERSION, SIZE, MODEL, SERIAL). Recent Talos versions (1.8+) include additional columns such as READ ONLY, TRANSPORT, ROTATIONAL, and WWID. The shown output is still a valid subset and not technically wrong, but readers on newer Talos versions will see additional columns.
- Starting with Talos v1.9/v1.10, volume/disk selection has shifted toward CEL-based expressions in `VolumeConfig` (e.g., `disk.transport == 'nvme'`). The post's `machine.install.diskSelector` syntax remains valid in v1.7 (matching the pinned installer image `ghcr.io/siderolabs/installer:v1.7.0`), but users on v1.10+ should be aware of the newer selector style.
- The installer image reference `ghcr.io/siderolabs/installer:v1.7.0` is valid but pinned to an older Talos release; readers may want to use the latest stable version.
- The `machine.disks` structure (`device` + `partitions[].mountpoint`) shown in "Handling Multiple Disks" matches the current schema.
- The advice that NVMe/SSD disks are preferable for etcd on control plane nodes is consistent with the official etcd documentation regarding disk latency sensitivity.
