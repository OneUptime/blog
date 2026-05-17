# Validation Summary: How to Configure Rook-Ceph on Talos Linux

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Talos Linux (machine config, talosctl, kernel modules, extraMounts, sysctls)
- Rook (operator, Helm chart)
- Ceph (CephCluster CRD, CephBlockPool, BlueStore, mons/mgrs/osds, dashboard)
- Kubernetes (CSI, StorageClass, ServiceMonitor)
- Helm (rook-release chart)
- Prometheus Operator (ServiceMonitor)

## Sources Consulted
- Talos Linux documentation: https://www.talos.dev/latest/
- Talos machine config reference: https://www.talos.dev/latest/reference/configuration/
- talosctl CLI reference: https://www.talos.dev/latest/reference/cli/
- Rook documentation: https://rook.io/docs/rook/latest/
- Rook Helm chart values.yaml: https://github.com/rook/rook/blob/master/deploy/charts/rook-ceph/values.yaml
- Rook CephCluster CRD docs: https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/
- Rook on Talos guide: https://www.talos.dev/latest/kubernetes-guides/configuration/ceph-with-rook/
- Ceph container image registry: https://quay.io/repository/ceph/ceph
- Ceph daemon network ports: https://docs.ceph.com/en/latest/rados/configuration/network-config-ref/

## Issues Found

1. **Invalid `/var/cri/conf.d/rook-limits.conf` file with systemd syntax** — The original post wrote a `machine.files` entry placing a file with `[Service]` / `LimitNOFILE=` (systemd unit syntax) at `/var/cri/conf.d/rook-limits.conf`. Talos does not run systemd, and `/var/cri/conf.d/` is reserved for containerd TOML drop-in fragments. A systemd-style file there would be parsed by nothing and have no effect on OSD file limits. Removed this misleading section.

2. **`csiRBDPluginResource` / `csiCephFSPluginResource` format** — The Rook Helm chart expects these values as a YAML-encoded string (pipe `|`) containing a list of `{name, resource{requests, limits}}` entries — not a structured object with `requests`/`limits` at the top level. Rewrote both fields to the correct YAML-string list-of-containers format.

3. **`talosctl get kernelmodules` is not a valid resource** — Replaced with `talosctl read /proc/modules`, which actually shows the loaded modules on a Talos node.

4. **`talosctl disks` deprecated** — Replaced the three `talosctl disks --nodes ...` invocations with the current resource-API form `talosctl get disks --nodes ...`.

5. **Ceph image tag `quay.io/ceph/ceph:v18.2`** — `v18.2` is a minor series, not a published tag in the upstream `quay.io/ceph/ceph` registry; tags carry the patch component (e.g., `v18.2.4`). Bumped to `v18.2.4` so the image actually pulls.

6. **`journalSizeMB` under `spec.storage.config`** — BlueStore (the default and only OSD backend in current Ceph releases) does not use a "journal"; the FileStore journal concept is obsolete. The relevant tunables for BlueStore are `databaseSizeMB` and `walSizeMB`. Removed the stray `journalSizeMB` line and kept `databaseSizeMB`.

7. **Incorrect inline comment "# Enable volume expansion"** above `enableCSIHostNetwork: true` — that field controls host networking for CSI plugin pods, not volume expansion. Replaced with an accurate comment.

## Review Notes
- The `name: ceph` kernel module is the in-tree CephFS client; the post loads it alongside `rbd`. This is correct for clusters that may use CephFS, but a pure RBD-only deployment only strictly needs `rbd`. Left as-is since CephFS is a reasonable default to keep available.
- `release-1.13` is referenced in the toolbox manifest URL. The branch still exists upstream so the manifest will resolve, but users running newer Rook (1.15/1.16+) should pin the toolbox manifest to a matching release branch to avoid version-skew between CRDs and the toolbox image.
- The Rook chart's CSI configuration surface is migrating to the `ceph-csi-operator` subchart in Rook master (post-1.16). The `csi.*` keys used here are valid for the 1.13–1.15 line of the chart; future readers on much newer Rook may need to consult the latest chart values.
- `network.provider: host` is a one-way choice — it cannot be changed after the cluster is initialized without destroying and recreating it. Worth flagging in production planning, though the post's recommendation for Talos is reasonable.
- `mon.placement.tolerations` only tolerates the `node-role.kubernetes.io/control-plane` taint; it does not pin mons there. If the intent is to run mons on control-plane nodes specifically, a matching `nodeAffinity` (or `nodeSelector`) would also be required. Left as-is because tolerating-only-but-not-requiring is also a defensible pattern.
