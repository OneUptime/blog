# Validation Summary: How to Set Up Rook-Ceph Object Storage (S3-Compatible)

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook (Kubernetes operator for Ceph)
- Ceph RADOS Gateway (RGW)
- Kubernetes (CRDs, pods, services, secrets)
- S3-compatible object storage
- AWS CLI (for testing)

## Sources Consulted
- Rook CephObjectStore CRD documentation: https://rook.io/docs/rook/latest/CRDs/Object-Storage/ceph-object-store-crd/
- Rook CephObjectStoreUser CRD documentation: https://rook.io/docs/rook/latest/CRDs/Object-Storage/ceph-object-store-user-crd/
- Rook Object Storage overview: https://rook.io/docs/rook/latest/Storage-Configuration/Object-Storage-RGW/object-storage/
- Ceph RGW Admin Capabilities documentation: https://docs.ceph.com/en/latest/radosgw/admin/#add-remove-admin-capabilities
- AWS CLI S3 command reference: https://docs.aws.amazon.com/cli/latest/reference/s3/

## Issues Found

1. **Mermaid diagram labeled data pool as "replicated" but spec uses erasure coding.** The CephObjectStore spec configures the data pool with `erasureCoded` (dataChunks: 2, codingChunks: 1), but the architecture diagram labeled it "Data Pool - replicated". Fixed to "Data Pool - erasure coded".

2. **CephObjectStoreUser capabilities used invalid `list` value.** The capabilities were set to `"read, write, list"` for all resource types (user, bucket, metadata, usage, zone). RGW admin capabilities only support `read`, `write`, or `*` as values — there is no `list` permission. Changed all capability values to `"*"` which grants full read/write access.

3. **Test pod command missing AWS credentials.** The `kubectl run` command in Step 6 did not pass the `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` environment variables into the pod. Environment variables set in the local shell are not automatically propagated to Kubernetes pods. Added `--env` flags to pass the credentials. Also removed the `--no-verify-ssl` flag since the endpoint uses HTTP (not HTTPS), making the flag unnecessary.

## Review Notes
- The RGW service name uses the `-a` suffix (`rook-ceph-rgw-my-store-a`). In some Rook versions for non-multisite setups, the service name may be `rook-ceph-rgw-my-store` without a zone suffix. The `-a` suffix is common in practice but users should verify against their actual Rook version.
- The CephObjectStore spec is well-structured with erasure coding for the data pool and replication for the metadata pool, which is a recommended production pattern.
- The `preservePoolsOnDelete: true` setting is a good safety practice for production environments.
- The pod anti-affinity placement rule correctly spreads RGW instances across different nodes.
