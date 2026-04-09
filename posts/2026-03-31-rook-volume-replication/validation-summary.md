# Validation Summary: How to Set Up Volume Replication with Rook-Ceph

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook-Ceph (RBD mirroring)
- Kubernetes
- CephRBDMirror CRD
- CephBlockPool with mirroring configuration
- VolumeReplication and VolumeReplicationClass CRDs (csi-addons)
- Ceph RBD CLI (`rbd mirror` commands)

## Sources Consulted
- Rook documentation on CephRBDMirror CRD (https://rook.io/docs/rook/latest/Storage-Configuration/Block-Storage-RBD/rbd-mirroring/)
- Ceph documentation on RBD mirroring (https://docs.ceph.com/en/latest/rbd/rbd-mirroring/)
- csi-addons/kubernetes-csi-addons GitHub repository for VolumeReplication CRDs (https://github.com/csi-addons/kubernetes-csi-addons)
- Cross-referenced with other validated posts in this blog covering CephRBDMirror deployment, VolumeReplicationClass setup, and RBD DR failover procedures

## Issues Found
1. **Step 7 - Failover VolumeReplication state was incorrect.** The post instructed readers to set `replicationState: secondary` on the secondary cluster's VolumeReplication after promoting it during failover. This is wrong — after the secondary cluster is promoted to primary, its VolumeReplication should be set to `replicationState: primary`. Changed `replicationState: secondary` to `replicationState: primary` and clarified the surrounding text.

## Review Notes
- The `entries_behind_master` field shown in the mirror status output (Step 6) uses older Ceph terminology. Newer Ceph releases may display this as `entries_behind_primary` following the project's inclusive naming changes. This is not incorrect for current deployments but may change in future versions.
- The Volume Replication Operator install URLs reference `csi-addons/kubernetes-csi-addons` with paths like `deploy/controller/crds.yaml`. The exact file paths in the repository may vary across releases; readers should check the repository's README for current installation instructions.
- The prerequisite states Rook operator version 1.8+ is needed, which is accurate — CephRBDMirror support was stabilized in Rook v1.8.
- The VolumeReplication API version `replication.storage.openshift.io/v1alpha1` is correct and consistently used across the csi-addons ecosystem.
