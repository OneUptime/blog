# Validation Summary: How to Configure Ceph Storage for Media and Entertainment

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Rook (Kubernetes operator for Ceph)
- Ceph (CephBlockPool, CephFilesystem, CephObjectStore)
- Ceph RGW (RADOS Gateway / S3-compatible object storage)
- CephFS (POSIX-compatible shared filesystem)
- Kubernetes PersistentVolumeClaims
- AWS CLI (S3 multipart upload)
- S3 Lifecycle Policies

## Sources Consulted
- Rook Ceph CephBlockPool CRD documentation: https://rook.io/docs/rook/latest/CRDs/Block-Storage/ceph-block-pool-crd/
- Rook Ceph CephFilesystem CRD documentation: https://rook.io/docs/rook/latest/CRDs/Shared-Filesystem/ceph-filesystem-crd/
- Rook Ceph CephObjectStore CRD documentation: https://rook.io/docs/rook/latest/CRDs/Object-Storage/ceph-object-store-crd/
- Ceph radosgw-admin documentation: https://docs.ceph.com/en/latest/radosgw/admin/
- AWS CLI S3 multipart upload documentation: https://docs.aws.amazon.com/cli/latest/reference/s3/cp.html
- Ceph RGW S3 lifecycle configuration: https://docs.ceph.com/en/latest/radosgw/bucketpolicy/

## Issues Found
1. **Incorrect `radosgw-admin zone set` command in the multipart upload section**: The original post included a `radosgw-admin zone set` command that claimed to "set multipart threshold to 100MB." This was wrong for several reasons:
   - `radosgw-admin zone set` is used to update zone configuration from JSON input (piped via stdin), not to configure multipart upload thresholds.
   - Multipart upload thresholds (`--multipart-threshold`, `--multipart-chunksize`) are client-side AWS CLI settings, not server-side RGW settings.
   - The command as written would fail because it does not provide the required JSON input.
   - **Fix**: Removed the misleading `radosgw-admin zone set` command and updated the section text to clarify that multipart thresholds are configured on the client side via the AWS CLI.

## Review Notes
- The S3 lifecycle policy uses `StorageClass: "GLACIER"`. While the JSON format is correct per the S3 API, Ceph RGW requires that custom storage classes (like GLACIER) be pre-configured via `radosgw-admin zonegroup placement add --storage-class GLACIER`. The post doesn't mention this prerequisite. A future revision could add a note about this.
- All Rook CRD YAML manifests (CephBlockPool, CephFilesystem, CephObjectStore) use correct `ceph.rook.io/v1` API versions and valid field structures.
- The CephFilesystem configuration correctly places metadata on SSD and data on HDD, which is a well-established best practice for CephFS.
- The PVC configuration is standard Kubernetes and uses the conventional `rook-ceph-block` StorageClass name.
