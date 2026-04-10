# Validation Summary: How to Use Ceph RGW as Docker Registry Backend

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook Ceph (RGW / RADOS Gateway)
- Docker Distribution Registry (registry:2)
- Harbor container registry
- Kubernetes (Deployments, Services, ConfigMaps)
- AWS CLI (S3-compatible operations)
- radosgw-admin CLI

## Sources Consulted
- Docker Distribution S3 storage driver documentation: https://distribution.github.io/distribution/storage-drivers/s3/
- Docker Distribution configuration reference: https://distribution.github.io/distribution/about/configuration/
- Harbor installation configuration guide and harbor.yml template (storage_service section passes through to Distribution driver)
- Ceph radosgw-admin CLI reference: https://docs.ceph.com/en/latest/radosgw/admin/
- Rook Ceph object store documentation: https://rook.io/docs/rook/latest/Storage-Configuration/Object-Storage-RGW/object-storage/

## Issues Found
1. **Harbor S3 configuration field names used underscores instead of Distribution driver format.**
   - **What was wrong:** The Harbor `storage_service.s3` section used `access_key`, `secret_key`, and `region_endpoint` (with underscores). Harbor passes this configuration directly to the Docker Distribution S3 storage driver, which expects `accesskey`, `secretkey`, and `regionendpoint` (no underscores). Using underscored names would cause the fields to be silently ignored, leading to authentication or connection failures.
   - **What was changed:** Replaced `access_key` with `accesskey`, `secret_key` with `secretkey`, and `region_endpoint` with `regionendpoint` in the Harbor configuration snippet.
   - **Why:** Aligns with the Docker Distribution S3 driver parameter naming convention, which Harbor uses directly.

## Review Notes
- The post uses slightly different RGW endpoint URL formats across sections (`.svc`, `.svc.cluster.local`, and short form without `.svc`). All are valid Kubernetes DNS names that resolve to the same service, but readers may find the inconsistency confusing.
- The `aws s3 mb` command in the first section would require AWS credentials to be configured beforehand (e.g., via environment variables or `aws configure`), which the post doesn't explicitly show. The credentials from the just-created RGW user would need to be set.
- The `chunksize: 5242880` (5 MB) is the S3 multipart upload minimum, which is a correct and sensible default.
- The Kubernetes Deployment correctly mounts the ConfigMap at `/etc/docker/registry`, which is the default configuration directory for the `registry:2` image.
