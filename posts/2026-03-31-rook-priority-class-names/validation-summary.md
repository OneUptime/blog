# Validation Summary: How to Set Priority Class Names for Rook-Ceph Components

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph (distributed storage)
- Kubernetes PriorityClass (scheduling.k8s.io/v1)
- Kubernetes pod scheduling and eviction

## Sources Consulted
- Rook CephCluster CRD documentation: https://rook.io/docs/rook/latest-release/CRDs/Cluster/ceph-cluster-crd/
- Rook CephFilesystem CRD documentation: https://rook.io/docs/rook/latest-release/CRDs/Shared-Filesystem/ceph-filesystem-crd/
- Rook CephObjectStore CRD documentation: https://rook.io/docs/rook/latest-release/CRDs/Object-Storage/ceph-object-store-crd/
- Kubernetes Pod Priority and Preemption documentation: https://kubernetes.io/docs/concepts/scheduling-eviction/pod-priority-preemption/

## Issues Found

### Issue 1: Incorrect CephCluster priorityClassName field path
- **What was wrong:** The post placed `priorityClassName` under `spec.placement.<daemon>.priorityClassName` (e.g., `spec.placement.mon.priorityClassName: rook-critical`). The correct location in the CephCluster CRD is `spec.priorityClassNames.<daemon>` — a dedicated top-level map, not nested inside the `placement` block.
- **What was changed:** Replaced the `spec.placement` structure with the correct `spec.priorityClassNames` map in both the main CephCluster example and the `system-cluster-critical` example.
- **Why:** The `placement` block in CephCluster is for node affinity, tolerations, and pod affinity/anti-affinity. Priority class names have their own separate field `priorityClassNames` at the spec level.

### Issue 2: Incorrect CephFilesystem priorityClassName field path
- **What was wrong:** The post showed `spec.metadataServer.placement.priorityClassName`, nesting priorityClassName inside the placement sub-object.
- **What was changed:** Moved `priorityClassName` to `spec.metadataServer.priorityClassName` (a direct child of `metadataServer`, not nested under `placement`).
- **Why:** Per the official CephFilesystem CRD documentation, `priorityClassName` is a sibling of `placement` under `metadataServer`, not a child of it.

### Issue 3: Incorrect CephObjectStore priorityClassName field path
- **What was wrong:** The post showed `spec.gateway.placement.priorityClassName`, nesting priorityClassName inside the placement sub-object.
- **What was changed:** Moved `priorityClassName` to `spec.gateway.priorityClassName` (a direct child of `gateway`, not nested under `placement`).
- **Why:** Per the official CephObjectStore CRD documentation, `priorityClassName` is a sibling of `placement` under `gateway`, not a child of it.

## Review Notes
- The PriorityClass resource definitions (scheduling.k8s.io/v1) are correct and use proper field names and values.
- The claimed value of `system-cluster-critical` (2,000,000,000) is accurate per Kubernetes documentation.
- The kubectl verification command is correct and functional.
- The general explanation of Kubernetes eviction behavior and how priority classes protect critical pods is accurate.
- The `all` key is also available in `spec.priorityClassNames` to set a default for all daemon types, which the post doesn't mention but is not required content.
