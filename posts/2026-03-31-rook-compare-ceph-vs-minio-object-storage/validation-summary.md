# Validation Summary: How to Compare Ceph vs MinIO for Object Storage

## Status
validated

## Post Type
Comparison Guide

## Technologies Covered
- Ceph (RADOS Gateway / RGW)
- MinIO
- Rook (Ceph Kubernetes Operator)
- MinIO Operator (Kubernetes)
- S3-compatible object storage
- Kubernetes (deployment manifests)

## Sources Consulted
- Rook Ceph CephObjectStore CRD documentation (https://rook.io/docs/rook/latest/Storage-Configuration/Object-Storage-RGW/object-storage/)
- MinIO Operator Tenant CRD documentation (https://min.io/docs/minio/kubernetes/upstream/reference/operator-crd.html)
- MinIO architecture and storage design documentation (https://min.io/docs/minio/linux/operations/concepts/architecture.html)
- Ceph RADOS Gateway documentation (https://docs.ceph.com/en/latest/radosgw/)
- MinIO erasure coding and metadata documentation (https://min.io/docs/minio/linux/operations/concepts/erasure-coding.html)

## Issues Found
1. **MinIO metadata description incorrect**: The Architecture Comparison table listed MinIO's metadata storage as "etcd / embedded". MinIO does not use etcd for metadata. MinIO stores object metadata inline with objects on the local filesystem (as extended attributes and companion metadata files on disk). Changed "etcd / embedded" to "Inline on local disk".

## Review Notes
- The Ceph/Rook CephObjectStore YAML is correct for the `ceph.rook.io/v1` API.
- The MinIO Tenant YAML is correct for the `minio.min.io/v2` API used by the MinIO Operator.
- The performance comparison table uses qualitative descriptions rather than benchmarks, which is appropriate for a general comparison post but readers should be aware actual performance depends heavily on hardware and configuration.
- The "Direct POSIX" backend description for MinIO is a simplification — MinIO writes to local POSIX filesystems (XFS recommended) — but it adequately conveys the distinction from Ceph's RADOS layer for a comparison article.
- MinIO's active-active geographic replication claim is correct (MinIO supports site replication).
- Ceph's exabyte-scale claim and dynamic OSD rebalancing are accurate.
