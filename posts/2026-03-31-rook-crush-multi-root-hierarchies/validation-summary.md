# Validation Summary: How to Set Up Multi-Root CRUSH Hierarchies

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ceph (CRUSH map, OSD management, pool creation)
- Rook (CephCluster CRD with storageClassDeviceSets)
- Kubernetes (node affinity, PersistentVolumeClaims)

## Sources Consulted
- Ceph official documentation: CRUSH map management (https://docs.ceph.com/en/latest/rados/operations/crush-map/)
- Ceph official documentation: Pool operations (https://docs.ceph.com/en/latest/rados/operations/pools/)
- Ceph official documentation: CRUSH map rules (https://docs.ceph.com/en/latest/rados/operations/crush-map-edits/)
- Rook official documentation: CephCluster CRD (https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/)
- Rook official documentation: Storage configuration (https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/#storage-class-device-sets)

## Issues Found
No technical issues found.

## Review Notes
- The `ceph pg dump pgs | awk '{print $1, $14}'` verification script uses a hardcoded column position (`$14`) for OSDs. The exact column index may vary between Ceph versions. In production, using `ceph pg dump --format json` with `jq` would be more robust, but the approach is valid as an illustrative example.
- The `ceph osd pool create` commands use explicit PG counts (128, 64). In modern Ceph (Nautilus and later), the PG autoscaler is enabled by default and explicit PG counts are optional. The syntax used is still valid and functional.
- The Rook YAML example shows only one `storageClassDeviceSet`. A complete multi-root setup would include a second device set for the secondary tier, but the post correctly explains that multi-root isolation is achieved with "separate device sets pointing to distinct nodes" and the single example is sufficient to illustrate the pattern.
