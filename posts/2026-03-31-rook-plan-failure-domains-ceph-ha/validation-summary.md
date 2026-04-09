# Validation Summary: How to Plan Failure Domains for Ceph HA

## Status
validated

## Post Type
Guide

## Technologies Covered
- Ceph (CRUSH algorithm, failure domains, OSD tree)
- Rook (CephBlockPool CRD, CephCluster CRD, topology awareness)
- Kubernetes (node labels, topology spread constraints)

## Sources Consulted
- Rook documentation on CephBlockPool CRD (`failureDomain`, `replicated.size`, `requireSafeReplicaSize` fields): https://rook.io/docs/rook/latest/CRDs/Block-Storage/ceph-block-pool-crd/
- Rook documentation on CephCluster placement and topology: https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/
- Ceph documentation on CRUSH maps and bucket types (osd, host, chassis, rack, row, pdu, pod, room, datacenter, zone, region, root): https://docs.ceph.com/en/latest/rados/operations/crush-map/
- Kubernetes well-known labels (`topology.kubernetes.io/zone`): https://kubernetes.io/docs/reference/labels-annotations-taints/
- Rook topology labels (`topology.rook.io/rack`): https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/#osd-topology
- Kubernetes topology spread constraints API: https://kubernetes.io/docs/concepts/scheduling-eviction/topology-spread-constraints/

## Issues Found
No technical issues found.

## Review Notes
- The CRUSH failure domain levels listed (osd, host, rack, zone) are a practical subset of the full Ceph CRUSH bucket type hierarchy which also includes chassis, row, pdu, pod, room, datacenter, and region. The chosen subset covers the most commonly used levels in Rook deployments.
- The `ceph osd dump | grep "^pool"` command works for quick inspection but `ceph osd pool ls detail` provides more structured output. Both are valid approaches.
- The OSD label selector `app: rook-ceph-osd` in the topology spread constraints is correct for current Rook versions.
