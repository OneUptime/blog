# Validation Summary: How to Set CRUSH Location Labels for CSI in Rook-Ceph

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Rook (Kubernetes operator for Ceph)
- Ceph (distributed storage)
- Kubernetes (container orchestration)
- CSI (Container Storage Interface)
- CRUSH (Controlled Replication Under Scalable Hashing)
- Read Affinity (locality-aware reads)

## Sources Consulted
- Rook latest release docs — Ceph CSI Drivers: https://www.rook.io/docs/rook/latest-release/Storage-Configuration/Ceph-CSI/ceph-csi-drivers/
- Rook CephCluster CRD documentation: https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/
- Rook v1.11 docs — Ceph CSI Drivers (historical reference): https://rook.io/docs/rook/v1.11/Storage-Configuration/Ceph-CSI/ceph-csi-drivers/
- Rook v1.14 Upgrade Guide (CSI_ENABLE_READ_AFFINITY removal): https://rook.io/docs/rook/v1.14/Upgrade/rook-upgrade/
- GitHub issue rook/rook#15639 — Documentation error on CSI ReadAffinity
- ceph-csi DaemonSet manifest (csi-rbdplugin.yaml): https://raw.githubusercontent.com/ceph/ceph-csi/master/deploy/rbd/kubernetes/csi-rbdplugin.yaml

## Issues Found

### Issue 1: Deprecated operator ConfigMap approach for read affinity
**What was wrong:** The post configured read affinity via `CSI_ENABLE_READ_AFFINITY` and `CSI_CRUSH_LOCATION_LABELS` keys in the `rook-ceph-operator-config` ConfigMap. These keys were valid in Rook v1.11-v1.13 but were removed in Rook v1.14. The v1.14 upgrade guide explicitly states this setting was removed from the operator config.
**What was changed:** Replaced the operator ConfigMap YAML with the modern CephCluster CR approach using `spec.csi.readAffinity.enabled` and `spec.csi.readAffinity.crushLocationLabels`. Updated the section heading accordingly.
**Why:** Users following the original instructions on Rook v1.14+ would find the settings have no effect, as the configuration has moved to the CephCluster custom resource.

### Issue 2: Fabricated `spec.storage.nodes[].config.crushLocations` field
**What was wrong:** The post showed a CephCluster CR snippet with `spec.storage.nodes[].config.crushLocations` containing key-value pairs like `region: us-east`. This field does not exist in any version of the Rook CephCluster CRD. The `spec.storage.nodes[].config` section supports fields like `metadataDevice`, `deviceClass`, `osdsPerDevice`, etc., but not `crushLocations`.
**What was changed:** Replaced the entire section with an explanation of how Rook automatically detects topology labels on Kubernetes nodes during OSD deployment and places OSDs into the corresponding CRUSH map buckets — no additional CephCluster configuration is needed.
**Why:** Users attempting to apply the original YAML would get validation errors since the field doesn't exist. The correct mechanism is node labels, which Rook reads automatically.

### Issue 3: Unsubstantiated claim about label ordering
**What was wrong:** The post claimed "The order of labels in `CSI_CRUSH_LOCATION_LABELS` determines the CRUSH topology depth." This claim is not supported by official Rook documentation. The CRUSH hierarchy depth is determined by the CRUSH map structure itself, not by the ordering of labels in the CSI configuration.
**What was changed:** Replaced the claim with an accurate description stating that the `crushLocationLabels` list specifies which Kubernetes node labels the CSI driver reads to determine the CRUSH topology position of each node.
**Why:** The original claim could mislead users into thinking label order controls CRUSH map structure, when in fact the CRUSH map hierarchy is independent of the CSI label configuration.

### Issue 4: Summary referenced outdated ConfigMap approach
**What was wrong:** The summary paragraph referenced "configuring the operator ConfigMap" which no longer applied after the fixes above.
**What was changed:** Updated to reference `spec.csi.readAffinity` in the CephCluster CR instead.
**Why:** Consistency with the corrected configuration approach throughout the post.

## Review Notes
- The node topology labels (`topology.kubernetes.io/region`, `topology.kubernetes.io/zone`, `topology.rook.io/rack`, `topology.rook.io/chassis`) are all correct and part of the official Rook topology label set.
- The `kubectl label node` commands are syntactically correct.
- The `ceph osd tree` verification command is correct.
- The CSI log inspection command using `-l app=csi-rbdplugin -c csi-rbdplugin` uses the correct label selector and container name.
- The post does not specify a Rook version. Users on older versions (v1.11-v1.13) may still use the operator ConfigMap approach, but the post now shows the current recommended method.
