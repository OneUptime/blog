# Validation Summary: How to Use MinIO Client (mc) with Ceph RGW

## Status
validated

## Post Type
Tutorial / Quick-reference guide

## Technologies Covered
- MinIO Client (mc) CLI tool
- Ceph RGW (RADOS Gateway) — S3-compatible object storage
- Rook (Ceph operator for Kubernetes)
- S3v4 signature protocol

## Sources Consulted
- MinIO Client official documentation: https://min.io/docs/minio/linux/reference/minio-mc.html
- MinIO Client admin commands documentation: https://min.io/docs/minio/linux/reference/minio-mc-admin.html
- Ceph RGW S3 compatibility documentation: https://docs.ceph.com/en/latest/radosgw/s3/
- MinIO Client install guide: https://min.io/docs/minio/linux/reference/minio-mc.html#install-mc

## Issues Found
1. **`mc admin info ceph` does not work with Ceph RGW.** The `mc admin` subcommands rely on MinIO's proprietary admin API endpoints, which Ceph RGW does not implement. Running `mc admin info` against a Ceph RGW endpoint will return an error. Removed this command from the "Verify the connection" section, leaving only `mc ls ceph` which correctly tests S3-level connectivity.

## Review Notes
- The `mc mirror --watch` and `mc watch` commands work with Ceph RGW because they use standard S3 bucket notification mechanisms, not MinIO-specific APIs.
- The `mc anonymous` commands (formerly `mc policy`) are the current correct syntax for recent mc versions.
- The install URL `https://dl.min.io/client/mc/release/linux-amd64/mc` and Homebrew formula `minio/stable/mc` are correct.
- The `--api S3v4` flag in the alias setup is appropriate for Ceph RGW, which defaults to v2 signatures in some configurations.
