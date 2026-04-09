# Validation Summary: How to Set Up Multi-Instance Object Storage in Rook

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph Object Storage (RADOS Gateway / RGW)
- Kubernetes (CRDs, Services, StorageClasses)
- ObjectBucketClaim (OBC) provisioning

## Sources Consulted
- Rook CephObjectStore CRD documentation: https://rook.io/docs/rook/latest/Storage-Configuration/Object-Storage-RGW/object-storage/
- Rook Object Bucket Claim documentation: https://rook.io/docs/rook/latest/Storage-Configuration/Object-Storage-RGW/ceph-object-bucket-claim/
- Rook CephObjectStore CRD spec reference: https://rook.io/docs/rook/v1.10/CRDs/Object-Storage/ceph-object-store-crd/
- Ceph RADOS Gateway data layout documentation: https://docs.ceph.com/en/latest/radosgw/layout/
- Rook object store design document: https://github.com/rook/rook/blob/master/design/ceph/object/store.md

## Issues Found

1. **Incorrect terminology: "RGW pool namespace"** (appeared in two locations)
   - **What was wrong**: The post referred to each CephObjectStore having its own "RGW pool namespace." Rook creates separate RADOS pools per object store (e.g., `store-production.rgw.buckets.data`, `store-staging.rgw.buckets.data`), not pool namespaces. RADOS namespaces are a different Ceph concept used for logical subdivision within a single pool.
   - **What was changed**: Replaced "RGW pool namespace" with "set of RADOS pools" in the intro paragraph and the Pool Isolation section.
   - **Why**: The original wording conflates two distinct Ceph concepts (pools vs. pool namespaces), which could confuse readers familiar with Ceph internals.

2. **Incorrect `radosgw-admin` command flag: `--rgw-zone default`**
   - **What was wrong**: The command `radosgw-admin bucket stats --rgw-zone default` includes a `--rgw-zone default` flag that assumes a multisite zone named "default" exists. In standard single-site Rook deployments (which this post describes), zones are not explicitly configured and this flag is unnecessary and potentially confusing.
   - **What was changed**: Removed the `--rgw-zone default` flag, leaving `radosgw-admin bucket stats` which lists bucket statistics across all stores.
   - **Why**: The multisite zone flag is irrelevant in the single-site multi-instance scenario described in this post and could cause errors or empty output if no zone named "default" is configured.

## Review Notes
- The CephObjectStore YAML manifests are correct: API version `ceph.rook.io/v1`, field names (`metadataPool`, `dataPool`, `gateway` with `port` and `instances`), and structure all match the current Rook CRD spec.
- The StorageClass provisioner `rook-ceph.ceph.rook.io/bucket` is correct for the default `rook-ceph` namespace. If the operator runs in a different namespace, the prefix must match that namespace.
- The service naming convention `rook-ceph-rgw-<store-name>` is accurate.
- The pool naming output (`store-production.rgw.buckets.data`, etc.) is correct, though in practice additional pools are also created (e.g., `.rgw.control`, `.rgw.log`, `.rgw.buckets.index`) that the example output omits for brevity, which is acceptable.
- The `ceph df | grep store-production` command shown as an alternative for capacity monitoring is the more straightforward approach for per-store pool usage.
