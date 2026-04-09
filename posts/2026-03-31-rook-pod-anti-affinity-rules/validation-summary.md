# Validation Summary: How to Set Pod Anti-Affinity Rules for Rook-Ceph

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph (distributed storage)
- Kubernetes (pod scheduling, affinity/anti-affinity API)
- CephCluster CRD (`ceph.rook.io/v1`)

## Sources Consulted
- Rook CephCluster CRD documentation: https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/
- Kubernetes Pod Anti-Affinity documentation: https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/#inter-pod-affinity-and-anti-affinity
- Kubernetes well-known labels (topology keys): https://kubernetes.io/docs/reference/labels-annotations-taints/
- Rook placement configuration: https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/#placement-configuration

## Issues Found
No technical issues found.

## Review Notes
- The claim that losing monitor quorum makes the cluster "read-only" is a simplification. In practice, quorum loss makes the cluster unavailable for management operations and eventually all I/O as OSDs cannot get updated cluster maps. This is a common shorthand and does not misrepresent the operational risk.
- The post correctly recommends `required` anti-affinity for monitors and managers and `preferred` for OSDs, which aligns with Rook upstream best practices.
- All YAML snippets are syntactically correct and use valid Kubernetes API field names and structures.
- The kubectl verification commands are valid and useful for confirming anti-affinity is applied.
- The label selectors (`app: rook-ceph-mon`, `app: rook-ceph-mgr`, `app: rook-ceph-osd`) match the labels Rook actually applies to daemon pods.
