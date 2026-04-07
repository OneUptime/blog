# Validation Summary: How to Size a Ceph Cluster for Object Storage

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rook (Kubernetes operator for Ceph)
- Ceph RADOS Gateway (RGW)
- Ceph Erasure Coding
- Kubernetes Services and kubectl
- S3-compatible object storage
- BlueStore OSD backend

## Sources Consulted
- Rook CephObjectStore CRD documentation: https://rook.io/docs/rook/latest/CRDs/Object-Storage/ceph-object-store-crd/
- Ceph erasure coding documentation: https://docs.ceph.com/en/latest/rados/operations/erasure-code/
- Rook RGW pod label conventions from Rook operator source
- Ceph OSD memory recommendations: https://docs.ceph.com/en/latest/start/hardware-recommendations/

## Issues Found

1. **Incorrect node count for EC 6+3 (line 36)**: The post stated "50 drives (6 nodes, 9 drives each)" for an EC 6+3 configuration with `failureDomain: host`. EC 6+3 requires k+m=9 chunks, meaning a minimum of 9 failure domains (hosts). 6 nodes is insufficient. Additionally, 6x9=54, not 50 as stated. Fixed to "54 drives (9 nodes, 6 drives each)" which satisfies the minimum failure domain requirement and corrects the arithmetic.

2. **Wrong pod selector label in LoadBalancer Service (line 121)**: The post used `rgw: my-store` as a selector label. Rook labels RGW pods with `rook_object_store: my-store`, not `rgw: my-store`. Using the wrong label would result in the Service selecting no pods. Fixed to `rook_object_store: my-store`.

## Review Notes
- The `radosgw-admin bucket stats` Python parsing script may fail on buckets with no `rgw.main` usage entry. A production script should handle missing keys, but this is acceptable for a demonstration snippet.
- The metadata pool "1% of data pool" rule of thumb is a rough guideline. Actual metadata pool sizing depends heavily on the number of objects and average object size, not just total data volume. Clusters with many small objects may need significantly more metadata space.
- The post correctly notes Ceph provides S3-compatible storage but doesn't mention that Ceph actually provides strong consistency for individual object operations (unlike the "eventual" consistency model mentioned as acceptable for workloads). This is fine since the post describes workload requirements, not Ceph guarantees.
