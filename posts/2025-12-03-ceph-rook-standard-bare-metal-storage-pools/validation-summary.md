# Validation Summary: Why Ceph + Rook Is the Gold Standard for Bare-Metal Kubernetes Storage Pools

## Status
validated

## Post Type
Guide / Opinion-leaning technical guide (architecture overview + hands-on Helm deployment walkthrough)

## Technologies Covered
- Ceph (RBD, CephFS, RGW, CRUSH, OSD/Mon/Mgr, PGs, erasure coding)
- Rook (operator, CephCluster / CephBlockPool CRDs, Helm charts)
- Kubernetes (StorageClass, PersistentVolumeClaim, CSI, topology labels)
- Helm (rook-release charts: `rook-ceph` operator, `rook-ceph-cluster`)

## Sources Consulted
- Rook CephBlockPool CRD docs: https://rook.io/docs/rook/latest/CRDs/Block-Storage/ceph-block-pool-crd/
- Rook `rook-ceph-cluster` Helm chart values.yaml: https://github.com/rook/rook/blob/master/deploy/charts/rook-ceph-cluster/values.yaml
- Rook Helm operator chart (`csi.enableRbdDriver`, `csi.enableCephfsDriver` values) and Rook release Helm repo (https://charts.rook.io/release)

## Issues Found
1. **Incorrect pool field `crushRoot: host`** (in the `cephBlockPools` values snippet). The comment claimed it would "spread replicas across hosts, not just OSDs," but that behavior is controlled by `failureDomain`, not `crushRoot`. `crushRoot` selects the root bucket of the CRUSH topology (default `default`); setting it to `host` is invalid and would not achieve host-level replica spreading. Changed to `failureDomain: host` (which is also the documented default for host-level redundancy) and moved it above the `replicated` block to match the chart's documented structure.
2. **Inaccurate device-consumption claim** ("consumes raw devices advertised via the `local-storage` CSI driver"). Rook consumes raw block devices directly through its OSD provisioning (as the snippet itself demonstrates with explicit `/dev/...` paths); it does not require or use a `local-storage` CSI driver for this. Reworded to "consumes raw block devices directly on each node."
3. **Loose architecture wording** ("disks advertised via Kubernetes `LocalVolume` or `LVM`"). `LocalVolume` is not the mechanism Rook uses. Reworded to "raw disks, partitions, or LVM logical volumes," matching Rook's supported device sources.

## Review Notes
- Helm commands verified: repo `https://charts.rook.io/release`, `helm upgrade --install rook-ceph rook-release/rook-ceph` with `csi.enableRbdDriver` / `csi.enableCephfsDriver`, and `rook-release/rook-ceph-cluster` chart are all correct and current.
- CephCluster values (`dataDirHostPath`, `network.provider: host`, `mon.count: 3`, `storage.useAllDevices`/`useAllNodes`/`nodes`, `dashboard.enabled`) are valid.
- StorageClass parameters (`csi.storage.k8s.io/fstype: xfs`, `imageFeatures: layering`, `reclaimPolicy: Delete`) are valid.
- Erasure-coded RBD (k=6, m=3) is supported in Ceph (EC data pool with a replicated metadata pool and `allow_ec_overwrites`); the table entry is reasonable, though in practice RBD on EC requires the extra metadata pool — worth a future clarifying note.
- Capacity guidance is broadly correct: Ceph's default `nearfull` ratio is ~0.85 and `full` is ~0.95, so the "slows when pools hit ~80%+" / "keep 10–15% free" advice aligns with defaults.
- "Blue/green Ceph version bumps" is marketing phrasing for Rook's rolling, daemon-by-daemon upgrades; not technically wrong but slightly imprecise.
