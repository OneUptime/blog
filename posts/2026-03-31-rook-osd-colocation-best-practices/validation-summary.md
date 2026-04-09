# Validation Summary: How to Configure OSD Co-Location Best Practices in Ceph

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph OSDs (Object Storage Daemons)
- Kubernetes CephCluster CRD (`ceph.rook.io/v1`)
- Kubernetes PriorityClass (`scheduling.k8s.io/v1`)
- Kubernetes node affinity and placement
- kubectl CLI

## Sources Consulted
- Rook CephCluster CRD documentation: https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/
- Rook GitHub CRD reference: https://github.com/rook/rook/blob/master/Documentation/CRDs/Cluster/ceph-cluster-crd.md
- Kubernetes Pod Priority and Preemption: https://kubernetes.io/docs/concepts/scheduling-eviction/pod-priority-preemption/
- Kubernetes Node Affinity: https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/#node-affinity

## Issues Found

### 1. PriorityClass created but never assigned to OSD pods
**What was wrong:** The post showed how to create a `PriorityClass` resource but did not show how to assign it to OSD pods in the `CephCluster` spec. Without the `spec.priorityClassNames.osd` field, creating the PriorityClass alone has no effect on OSD scheduling priority.
**What was changed:** Added a YAML snippet showing `spec.priorityClassNames.osd: ceph-osd-priority` in the CephCluster spec, with a brief explanation that this is needed for OSD pods to actually use the priority class.
**Why:** Rook requires explicit configuration via `spec.priorityClassNames` to assign priority classes to its managed pods. Without this, the stated goal of ensuring OSDs are evicted last would not be achieved.

### 2. Text incorrectly mentioned "tolerations"
**What was wrong:** The text introducing the node separation section said "use node labels and tolerations to dedicate nodes to OSDs" but the code examples only showed node labels and nodeAffinity — no taints or tolerations were demonstrated.
**What was changed:** Changed "use node labels and tolerations to dedicate nodes to OSDs" to "use node labels and node affinity rules to direct OSDs to specific nodes" to accurately describe the configuration shown.
**Why:** NodeAffinity directs OSDs to labeled nodes but does not prevent other pods from scheduling there (that would require taints + tolerations). The text should match the code examples provided.

## Review Notes
- The node separation section uses nodeAffinity to target OSDs to specific nodes, but does not use taints/tolerations to prevent non-storage pods from scheduling on those nodes. For true node dedication, taints and tolerations would be needed in addition. This is a potential improvement for a future update but is not a technical error in the current content.
- The `osdsPerDevice` values are correctly represented as strings, matching the Rook CRD requirement.
- The resource limit values shown are reasonable defaults for OSD workloads.
- The advice about MON/OSD co-location on small nodes (< 16 GB RAM) is sound general guidance.
