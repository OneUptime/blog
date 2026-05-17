# Validation Summary: How to Configure Extra Disks for Workloads in Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux (machine configuration, `machine.disks`, disk selectors via CEL)
- `talosctl` CLI (disks, get volumes, get volumestatus, get mounts, apply-config)
- Kubernetes (Pod hostPath volumes, StorageClass, PersistentVolume, PersistentVolumeClaim, nodeAffinity)
- Local Path Provisioner (`rancher.io/local-path`)
- Longhorn, OpenEBS Local PV, Rook-Ceph (integration patterns)
- Prometheus / node_exporter (alerting on `node_filesystem_device_error`)

## Sources Consulted
- Talos disk management overview: https://docs.siderolabs.com/talos/v1.11/configure-your-talos-cluster/storage-and-disk-management/disk-management/
- Talos common volume configuration / CEL disk selectors: https://docs.siderolabs.com/talos/v1.12/configure-your-talos-cluster/storage-and-disk-management/disk-management/common/
- Talos user volumes: https://docs.siderolabs.com/talos/v1.12/configure-your-talos-cluster/storage-and-disk-management/disk-management/user
- Talos `UserVolumeConfig` reference: https://docs.siderolabs.com/talos/v1.10/reference/configuration/block/uservolumeconfig
- Longhorn on Talos Linux: https://longhorn.io/docs/1.10.0/advanced-resources/os-distro-specific/talos-linux-support/
- Kubito guide on additional disks (mount point requirement): https://kubito.dev/posts/talos-linux-additonal-disks-to-nodes/
- agos.one article on resizing additional disks in Talos: https://www.agos.one/resize-additional-disks-in-siderolabs-talos-linux/
- rancher/local-path-provisioner: https://github.com/rancher/local-path-provisioner
- prometheus/node_exporter `node_filesystem_device_error` metric: https://github.com/prometheus/node_exporter

## Issues Found
1. **Invalid CEL selector field `disk.type`** — multiple disk selector examples used `disk.type == "ssd"` and `disk.type == "hdd"`. Talos's disk resource has no `type` field; the correct attribute for distinguishing rotational media from SSD/NVMe is `disk.rotational` (boolean). Replaced all `disk.type == "ssd"` / `!disk.type == "hdd"` usages with the appropriate `!disk.rotational` / `disk.rotational` form. Verified against the official Talos common disk-management docs and the project's own validated post on CEL disk selectors.
2. **Invalid CEL selector field `disk.systemDisk`** — multiple selectors used `!disk.systemDisk`. The system-disk indicator in Talos's CEL context is the top-level variable `system_disk`, not a field on `disk`. Replaced all `disk.systemDisk` references with `system_disk`.
3. **Longhorn mountpoint `/var/lib/longhorn` is invalid for Talos** — Talos requires `machine.disks` mountpoints to live under `/var/mnt`. Changed the example mountpoint to `/var/mnt/longhorn` and added a brief note that Longhorn's default data path and a kubelet bind mount need to be configured to use it (per the official Longhorn-on-Talos documentation).
4. **OpenEBS Local PV mountpoint `/var/openebs/local` is invalid for Talos** — Same `/var/mnt` restriction applies. Updated the example to `/var/mnt/openebs` with a short note about the rule.
5. **Incorrect claim that Talos automatically grows user-managed partitions** — The original "Talos will grow the partition and filesystem to accommodate the new size" is wrong for `machine.disks`. Talos only auto-resizes its own system partitions; user-managed `machine.disks` partitions must be grown manually with tools like `parted` and `xfs_growfs`. Rewrote the paragraph to reflect this and mention the newer `UserVolumeConfig` resource (which does support `grow: true`).

## Review Notes
- `machine.disks` is technically deprecated in favor of `UserVolumeConfig` in newer Talos releases (1.10+), but it remains supported for backward compatibility. The post is internally consistent in using the legacy form; flagging this transition is something a future revision could expand on, but it is not a correctness bug.
- The Local Path Provisioner StorageClass example uses the `nodePath` parameter; this is a valid parameter but only takes effect when the path is also listed in the provisioner's `nodePathMap` ConfigMap. The post does not show that ConfigMap step — readers following the example will need to update the provisioner deployment as well. Not strictly incorrect, but worth noting.
- The `node_filesystem_device_error` metric is real but primarily indicates `statfs` collection failures (often permission/mount-propagation issues), not necessarily hardware disk failure. The alert's name and summary are slightly broader than what the metric strictly measures. Left as-is since it's a defensible monitoring pattern.
- `talosctl disks` (non-`get` form) is still supported alongside `talosctl get disks`; both are valid.
