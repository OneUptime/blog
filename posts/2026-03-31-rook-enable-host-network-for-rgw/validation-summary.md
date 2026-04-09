# Validation Summary: How to Enable Host Network for RGW in Rook

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph RADOS Gateway (RGW)
- Kubernetes (pod networking, host networking, Services)
- S3-compatible object storage

## Sources Consulted
- Rook official documentation — CephObjectStore CRD specification: https://rook.io/docs/rook/latest/CRDs/Object-Storage/ceph-object-store-crd/
- Rook official documentation — Object Storage (RGW) guide: https://rook.io/docs/rook/latest/Storage-Configuration/Object-Storage-RGW/object-storage/
- Rook official documentation — Network providers (host networking): https://rook.io/docs/rook/latest/CRDs/Cluster/network-providers/
- Rook example manifests on GitHub: https://github.com/rook/rook/blob/master/deploy/examples/object.yaml

## Issues Found
No technical issues found.

## Review Notes
- The `hostNetwork` field is confirmed as a direct child of `spec.gateway` in the CephObjectStore CRD, distinct from the cluster-wide `spec.network.provider: host` setting in the CephCluster CR. The blog correctly targets the per-daemon RGW setting.
- The scheduling advice mentions `affinity` and `tolerations` "in the CephObjectStore spec" — these are technically nested under `spec.gateway.placement` in the CRD. The blog's phrasing is acceptable for a high-level guide but readers may need to check the CRD docs for exact nesting.
- The post targets Rook v1.10+. The `hostNetwork` gateway field has been available since well before v1.10 and remains current in the latest Rook releases.
