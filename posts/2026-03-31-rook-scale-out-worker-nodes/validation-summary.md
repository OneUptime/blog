# Validation Summary: How to Scale Out Rook-Ceph by Adding New Worker Nodes

## Status
validated

## Post Type
Tutorial / Step-by-step Guide

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph (distributed storage)
- Kubernetes (container orchestration)
- CRUSH map (Ceph data placement algorithm)
- OSD (Object Storage Daemon)

## Sources Consulted
- Rook CephCluster CRD documentation: https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/
- Rook storage configuration (node and device selection): https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/#storage-selection-settings
- Ceph OSD management documentation: https://docs.ceph.com/en/latest/rados/operations/add-or-rm-osds/
- Ceph CRUSH map documentation: https://docs.ceph.com/en/latest/rados/operations/crush-map/
- Kubernetes kubectl debug documentation: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_debug/

## Issues Found
1. **Incorrect rebalancing completion indicator**: The post stated rebalancing completes when `0 bytes misplaced` is shown. Ceph tracks misplaced *objects*, not bytes, and when rebalancing is complete the "objects misplaced" line disappears entirely from `ceph status` output rather than showing a zero count. Fixed to show just `HEALTH_OK` and explain that the misplaced line disappears.

2. **Inconsistent OSD count in example output**: The explicit node configuration in Option 2 specifies 3 disks (sdb, sdc, sdd) for worker-04, but the expected `ceph osd tree` output in Step 5 only showed 2 OSDs (osd.6 and osd.7). Added the missing third OSD (osd.8) to match the 3 configured disks.

## Review Notes
- Step 4 suggests restarting the Rook operator to "trigger immediate scanning." While this works, it is not strictly necessary — the Rook operator watches for CephCluster CR changes and will automatically reconcile. The restart is useful mainly to speed up auto-discovery of new nodes, not as a required step. The current wording is acceptable but could be clarified in a future revision.
- The `kubectl debug` command used for node inspection requires the EphemeralContainers feature (GA since Kubernetes 1.25). This is fine for modern clusters but worth noting for readers on older versions.
- The `ceph osd crush reweight` command in Step 7 is correct but readers should be aware that Rook may override manual CRUSH weight changes on operator reconciliation. For persistent weight adjustments, configuring them in the CephCluster CR or using `ceph osd crush reweight-by-utilization` may be more appropriate.
