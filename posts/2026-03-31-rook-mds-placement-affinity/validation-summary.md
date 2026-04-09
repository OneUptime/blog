# Validation Summary: How to Configure MDS Placement and Affinity in Rook

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph MDS (Metadata Server)
- CephFilesystem CRD (`ceph.rook.io/v1`)
- Kubernetes scheduling: nodeAffinity, podAntiAffinity, tolerations, topologySpreadConstraints

## Sources Consulted
- Rook CephFilesystem CRD documentation: https://rook.io/docs/rook/latest-release/CRDs/Shared-Filesystem/ceph-filesystem-crd/
- Kubernetes Pod Scheduling documentation: https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/
- Kubernetes Topology Spread Constraints: https://kubernetes.io/docs/concepts/scheduling-eviction/topology-spread-constraints/
- Ceph MDS Administration Commands: https://docs.ceph.com/en/latest/cephfs/administration/
- Rook Go API package: https://pkg.go.dev/github.com/rook/rook/pkg/apis/ceph.rook.io/v1

## Issues Found
No technical issues found.

## Review Notes
- The `metadataServer.placement` field path, all supported sub-fields (`nodeAffinity`, `podAntiAffinity`, `tolerations`, `topologySpreadConstraints`), and their YAML structures are correct per Rook and Kubernetes documentation.
- The API version `ceph.rook.io/v1` and all CephFilesystem spec fields (`preserveFilesystemOnDelete`, `activeCount`, `activeStandby`, `resources`, `priorityClassName`) are accurate.
- The label `app: rook-ceph-mds` is the correct label for MDS pods in Rook.
- Kubernetes scheduling syntax is correct for both `required` and `preferred` variants of node affinity and pod anti-affinity, including the `podAffinityTerm` wrapper used in preferred pod anti-affinity.
- Verification commands (`ceph mds stat`, `ceph fs status`) are valid Ceph CLI commands executed via the standard rook-ceph-tools deployment.
- None.
