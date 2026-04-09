# Validation Summary: How to Configure Pool Replicas Across Failure Domains

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph (distributed storage system)
- Ceph CRUSH algorithm and CRUSH rules
- CephBlockPool and CephCluster CRDs (ceph.rook.io/v1 API)
- Kubernetes node labeling and topology labels
- kubectl CLI

## Sources Consulted
- Rook official documentation on CephBlockPool CRD — https://rook.io/docs/rook/latest/CRDs/Block-Storage/ceph-block-pool-crd/
- Rook official documentation on CephCluster topology and OSD topology — https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/
- Ceph official documentation on CRUSH rules — https://docs.ceph.com/en/latest/rados/operations/crush-map/
- Ceph official documentation on pool management — https://docs.ceph.com/en/latest/rados/operations/pools/
- Kubernetes well-known labels documentation — https://kubernetes.io/docs/reference/labels-annotations-taints/

## Issues Found
1. **Incorrect node labels for rack-level topology**: The "Configuring Rack-Level Failure Domains" section used `topology.kubernetes.io/zone` labels on nodes but configured the pool with `failureDomain: rack`. Rook maps `topology.kubernetes.io/zone` to the `zone` CRUSH bucket type, not `rack`. For rack-level failure domains, the correct label is `topology.rook.io/rack`. Changed all five `kubectl label` commands from `topology.kubernetes.io/zone=rack-X` to `topology.rook.io/rack=rack-X` to match the `failureDomain: rack` pool configuration.

## Review Notes
- The CephCluster YAML snippet in the "Configuring Rack-Level Failure Domains" section shows general OSD placement configuration (node affinity by role label) but does not directly configure rack topology. Rook automatically detects topology from node labels, so no special CephCluster configuration is needed beyond ensuring the correct topology labels exist on nodes. The snippet is not technically wrong but could be clarified in a future revision to avoid implying it is required for rack topology.
- All Ceph CLI commands (`ceph osd pool ls detail`, `ceph osd crush rule dump`, `ceph osd crush rule create-replicated`, `ceph osd pool set`, `ceph osd map`, `ceph pg dump`) use correct syntax and flags.
- The CephBlockPool CRD YAML uses the correct `ceph.rook.io/v1` API version with `failureDomain` correctly placed at the `spec` level.
- The `requireSafeReplicaSize: true` recommendation in the summary is good practice and correctly described.
