# Validation Summary: How to Create a CephObjectStore in Rook

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph RADOS Gateway (RGW)
- Kubernetes (CRDs, Services, Secrets, Pod scheduling)
- CephObjectStore custom resource
- Erasure coding and replicated pools
- TLS configuration for S3 endpoints

## Sources Consulted
- Rook CephObjectStore CRD documentation: https://rook.io/docs/rook/latest-release/CRDs/Object-Storage/ceph-object-store-crd/
- Rook Object Storage overview: https://rook.io/docs/rook/latest/Storage-Configuration/Object-Storage-RGW/object-storage/
- Rook CephBlockPool CRD (pool spec reference): https://rook.io/docs/rook/latest-release/CRDs/Block-Storage/ceph-block-pool-crd/
- Rook CRD specification reference: https://rook.io/docs/rook/latest/CRDs/specification/
- Ceph radosgw-admin man page: https://docs.ceph.com/en/latest/man/8/radosgw-admin/

## Issues Found

### 1. Incorrect jq path for `radosgw-admin period get-current`
- **What was wrong:** The command used `jq '.current_period.id'` but `radosgw-admin period get-current` returns a top-level JSON object with `id` and `epoch` fields directly, not nested under `current_period`.
- **What was changed:** Updated jq path from `.current_period.id` to `.id`.
- **Why:** The original jq expression would return `null` since there is no `current_period` key in the output.

### 2. `.rgw.root` listed in `grep my-store` output
- **What was wrong:** The expected output of `ceph osd pool ls | grep my-store` included `.rgw.root`, but this pool does not contain "my-store" in its name and would not be matched by the grep filter.
- **What was changed:** Removed `.rgw.root` from the expected output and added a note explaining that this pool exists but won't appear in the grep results.
- **Why:** Showing `.rgw.root` in the output would confuse readers when they don't see it in their own grep results.

### 3. Incorrect RGW service endpoint name
- **What was wrong:** The status example showed the endpoint as `rook-ceph-rgw-my-store-a.rook-ceph.svc.cluster.local:80` with an erroneous `-a` suffix.
- **What was changed:** Corrected to `rook-ceph-rgw-my-store.rook-ceph.svc.cluster.local:80`.
- **Why:** For a non-multisite CephObjectStore, the Rook operator names the service `rook-ceph-rgw-<storeName>` without any zone suffix. The `-a` suffix only appears in multisite configurations with explicit zone names.

## Review Notes
- The YAML specifications for CephObjectStore are accurate and match the current Rook CRD schema, including metadataPool, dataPool, gateway, healthCheck, and zone fields.
- The pool configuration fields (failureDomain, replicated.size, replicated.requireSafeReplicaSize, erasureCoded.dataChunks/codingChunks, parameters.compression_mode) are all valid.
- The TLS setup procedure using Kubernetes TLS secrets with sslCertificateRef is correct.
- The placement spec with podAntiAffinity is correctly structured.
- The healthCheck.bucket.disabled and healthCheck.bucket.interval fields are correct (Rook uses `disabled` not `enabled`).
- The scaling approach via kubectl patch is correct and idiomatic.
