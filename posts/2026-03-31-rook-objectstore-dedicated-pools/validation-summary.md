# Validation Summary: How to Configure Object Store with Dedicated Pools in Rook

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph RADOS Gateway (RGW)
- CephObjectStore CRD (ceph.rook.io/v1)
- Ceph RADOS pools (replicated and erasure coded)
- Kubernetes (kubectl, pod labels, CRD status)
- radosgw-admin CLI

## Sources Consulted
- Rook CephObjectStore CRD documentation: https://rook.github.io/docs/rook/latest/CRDs/Object-Storage/ceph-object-store-crd/
- Rook Object Storage overview: https://rook.io/docs/rook/latest/Storage-Configuration/Object-Storage-RGW/object-storage/
- Rook GitHub repository examples: https://github.com/rook/rook/blob/master/Documentation/CRDs/Object-Storage/ceph-object-store-crd.md
- Rook object store design doc: https://github.com/rook/rook/blob/master/design/ceph/object/store.md
- Ceph pool operations documentation: https://docs.ceph.com/en/latest/rados/operations/pools/
- radosgw-admin man page: https://docs.ceph.com/en/latest/man/8/radosgw-admin/
- Rook CRD specification: https://rook.io/docs/rook/latest/CRDs/specification/

## Issues Found
No technical issues found.

## Review Notes
- All YAML manifests use correct field names and valid values for the CephObjectStore CRD (`spec.metadataPool`, `spec.dataPool`, `spec.preservePoolsOnDelete`, `spec.gateway`).
- The erasure coding example correctly keeps `metadataPool` as replicated while using EC for `dataPool` — this is an architectural requirement of Ceph RGW, accurately stated in the post.
- Pool naming conventions (`my-store.rgw.buckets.data`, `my-store.rgw.buckets.index`, `my-store.rgw.meta`) match the actual pools Rook creates. Additional pools like `.rgw.root`, `.rgw.control`, `.rgw.log`, and `.rgw.buckets.non-ec` also exist but the post's use of "and others" covers this.
- All CLI commands (`ceph osd pool ls detail`, `ceph osd pool get ... all`, `radosgw-admin user create`) use valid syntax and flags.
- The pod label `app=rook-ceph-rgw` and the `.status.phase` field returning `Ready` are both correct.
- The `--access-key` and `--secret-key` flags on `radosgw-admin user create` set static credentials, which is fine for a test/demo scenario as shown.
