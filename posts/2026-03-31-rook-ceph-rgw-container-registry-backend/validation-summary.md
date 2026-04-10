# Validation Summary: How to Use Ceph RGW as Container Registry Backend

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph RGW (RADOS Gateway / S3-compatible object storage)
- Docker Distribution Registry v2 (container image registry)
- Kubernetes (Deployments, Services, Secrets)
- AWS CLI (S3 bucket operations against Ceph RGW)

## Sources Consulted
- [S3 storage driver | CNCF Distribution](https://distribution.github.io/distribution/storage-drivers/s3/) — official parameter reference for S3 storage driver configuration
- [Configuring a registry | CNCF Distribution](https://distribution.github.io/distribution/about/configuration/) — registry config.yml structure and health check options
- [distribution/distribution S3 driver source code](https://github.com/distribution/distribution/blob/main/registry/storage/driver/s3-aws/s3.go) — verified parameter names in source

## Issues Found
1. **Incorrect S3 driver parameter name `pathstyle`**: The registry config used `pathstyle: true` under `storage.s3`. The correct parameter name is `forcepathstyle: true` per the CNCF Distribution S3 storage driver documentation. Without this fix, the registry would attempt virtual-hosted-style S3 URLs (e.g., `container-registry.rook-ceph-rgw-my-store.rook-ceph`), which would fail against Ceph RGW. Changed `pathstyle` to `forcepathstyle`.

## Review Notes
- The `aws s3 mb` and `aws s3 ls` commands require AWS credentials to be configured (e.g., via `AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY` environment variables). The post assumes the reader has already set these, which is reasonable but could trip up beginners.
- The `insecure-registries` approach works for testing but production deployments should use TLS. The post doesn't claim otherwise, so this is acceptable for a tutorial context.
- The `registry:2.8` image tag is valid. Readers should check for the latest stable 2.x release when following this tutorial.
