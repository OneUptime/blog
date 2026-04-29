# Validation Summary: How to Configure MinIO Object Storage with IPv6

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- MinIO Object Storage Server
- MinIO Client (mc)
- IPv6 networking
- systemd
- AWS S3 API / boto3 (Python SDK)
- Kubernetes (Deployment + dual-stack Service)
- curl / ss (verification tools)

## Sources Consulted
- MinIO official documentation: https://min.io/docs/minio/linux/index.html
- MinIO server `--address` / `--console-address` flag reference: https://min.io/docs/minio/linux/reference/minio-server/minio-server.html
- MinIO environment variables (`MINIO_ROOT_USER`, `MINIO_ROOT_PASSWORD`, `MINIO_VOLUMES`, `MINIO_SERVER_URL`, `MINIO_BROWSER_REDIRECT_URL`): https://min.io/docs/minio/linux/reference/minio-server/settings/
- MinIO distributed deployment guide: https://min.io/docs/minio/linux/operations/install-deploy-manage/deploy-minio-multi-node-multi-drive.html
- MinIO Client (`mc alias set`) reference: https://min.io/docs/minio/linux/reference/minio-mc/mc-alias-set.html
- MinIO health check endpoint (`/minio/health/live`): https://min.io/docs/minio/linux/operations/monitoring/healthcheck-probe.html
- boto3 Config / `s3v4` / path-style addressing: https://boto3.amazonaws.com/v1/documentation/api/latest/guide/s3.html
- Kubernetes dual-stack services (`ipFamilyPolicy`, `ipFamilies`): https://kubernetes.io/docs/concepts/services-networking/dual-stack/
- RFC 3986 (URI bracket notation for IPv6 literals): https://datatracker.ietf.org/doc/html/rfc3986#section-3.2.2

## Issues Found
No technical issues found.

## Review Notes
- The systemd unit defines custom environment variable names (`MINIO_OPTS_BIND`, `MINIO_CONSOLE_BIND`) and substitutes them into the `ExecStart` line. This works but differs from the MinIO-published convention, which typically aggregates flags into a single `MINIO_OPTS` variable (e.g., `MINIO_OPTS="--address [::]:9000 --console-address [::]:9001"`). Either approach is functionally valid.
- The `boto3` example correctly forces `signature_version='s3v4'` and path-style addressing, which is required for MinIO since MinIO does not support virtual-hosted-style requests by default.
- For the Kubernetes `Service`, listing `IPv6` first in `ipFamilies` makes IPv6 the primary family of the ClusterIP. This requires the underlying cluster to be configured for dual-stack networking; on an IPv4-only cluster this would fail. A note about the cluster prerequisite would be a useful future addition but is not technically incorrect.
- `region_name='us-east-1'` is correctly noted as a boto3 requirement that MinIO ignores by default. If users have configured `MINIO_REGION` on the server, the region must match.
