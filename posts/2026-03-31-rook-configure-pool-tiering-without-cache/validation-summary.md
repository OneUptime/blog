# Validation Summary: How to Configure Pool Tiering Without Cache Tiering

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph (distributed storage - pools, CRUSH rules, erasure coding, RBD)
- Kubernetes (CephBlockPool CRD, StorageClass, CronJob, PersistentVolumeClaims)
- rclone (data migration tool)

## Sources Consulted
- Rook CephBlockPool CRD documentation (https://rook.io/docs/rook/latest/CRDs/Block-Storage/ceph-block-pool-crd/)
- Rook erasure-coded StorageClass example (storageclass-ec.yaml in Rook GitHub repo)
- Rook device class and CRUSH rule management documentation
- Ceph documentation on cache tiering deprecation
- Ceph documentation on erasure coding with RBD (metadata pool requirement)
- Kubernetes Job/CronJob API specification (restartPolicy requirements)

## Issues Found

1. **Erasure-coded RBD pool missing replicated metadata pool**: The `tier-capacity` erasure-coded pool was created as a `CephBlockPool` for RBD use, but RBD requires a separate replicated pool for metadata. Rook does not create this automatically. Added a `tier-capacity-metadata` replicated CephBlockPool definition after the EC pool definition.

2. **StorageClass for EC pool missing `dataPool` parameter**: The `ceph-capacity` StorageClass referenced only `pool: tier-capacity` (the EC pool). For erasure-coded RBD, the StorageClass must set `pool` to the replicated metadata pool and `dataPool` to the EC data pool. Changed to `pool: tier-capacity-metadata` and added `dataPool: tier-capacity`.

3. **CronJob missing `restartPolicy`**: Kubernetes requires `restartPolicy` to be explicitly set to `OnFailure` or `Never` for Job/CronJob pod specs. Without it, the API server rejects the resource with a validation error. Added `restartPolicy: OnFailure`.

4. **CronJob missing `volumes` and `volumeMounts`**: The migration CronJob referenced paths `/mnt/fast/archive/` and `/mnt/capacity/archive/` but had no volume definitions or mounts. Without these, the container has no access to the PVC-backed storage from either tier. Added `volumeMounts` and `volumes` sections with PersistentVolumeClaim references.

## Review Notes
- Step 2 (manual CRUSH rule assignment via `ceph osd pool set crush_rule`) is redundant when using Rook's `deviceClass` field, which automatically creates and applies the appropriate CRUSH rule. The step is not technically wrong but may confuse readers into thinking it is required alongside the Rook CRD configuration.
- The StorageClass examples omit CSI secret parameters (`csi.storage.k8s.io/provisioner-secret-name`, etc.) that are typically required. This is acceptable for a simplified tutorial but readers should consult the full Rook StorageClass examples for production use.
- The CronJob uses `rclone copy` (which does not delete source files) while the text says "move aged data." This is arguably safer for a tutorial but readers wanting true migration should consider `rclone move` instead.
