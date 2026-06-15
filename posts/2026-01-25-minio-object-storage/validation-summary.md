# Validation Summary: How to Configure MinIO for Object Storage

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- MinIO server and MinIO Client (`mc`)
- S3-compatible object storage
- Docker
- Kubernetes
- systemd
- TLS certificates
- Restic
- Velero
- Rclone
- Prometheus metrics

## Sources Consulted
- MinIO Client `mc` command help from `mc version RELEASE.2025-08-13T08-35-41Z`
- MinIO `mc admin user add` documentation: https://docs.min.io/aistor/reference/cli/admin/mc-admin-user/mc-admin-user-add/
- MinIO `mc admin policy attach` documentation: https://docs.min.io/aistor/reference/cli/admin/mc-admin-policy/mc-admin-policy-attach/
- MinIO `mc anonymous set-json` documentation: https://docs.min.io/aistor/reference/cli/mc-anonymous/mc-anonymous-set-json/
- MinIO `mc ilm rule import` documentation: https://docs.min.io/aistor/reference/cli/mc-ilm-rule/mc-ilm-rule-import/
- MinIO metrics and Prometheus documentation: https://docs.min.io/aistor/operations/monitoring/metrics-and-alerts/
- MinIO metrics v2 reference: https://docs.min.io/aistor/operations/monitoring/metrics-and-alerts/metrics-v2/
- MinIO TLS network encryption documentation: https://docs.min.io/aistor/installation/linux/network-encryption/
- MinIO distributed deployment documentation: https://github.com/minio/minio/blob/master/docs/distributed/README.md
- Velero MinIO quick start documentation: https://velero.io/docs/main/contributions/minio/
- Restic repository preparation documentation: https://restic.readthedocs.io/en/stable/030_preparing_a_new_repo.html
- Rclone S3 provider documentation: https://rclone.org/s3/

## Issues Found
- The lifecycle examples used the older `mc ilm import` and `mc ilm export` commands. Updated them to the current `mc ilm rule import` and `mc ilm rule export` commands documented by MinIO and confirmed by the current `mc` CLI help.
- The Prometheus section described `mc admin prometheus generate` as enabling metrics. Updated it to state that the command generates a Prometheus scrape configuration, and noted that metrics endpoints require authentication by default unless `MINIO_PROMETHEUS_AUTH_TYPE=public` is configured.
- The Prometheus example used the v2 cluster metrics endpoint while the surrounding guidance implied general metrics collection. Updated the example to use current v3 metrics generation and the v3 base endpoint.
- Several metric names were outdated or inaccurate for current MinIO metrics. Updated `minio_s3_requests_total` to `minio_api_requests_total`, `minio_s3_errors_total` to `minio_api_requests_errors_total`, and `minio_node_disk_free_bytes` to `minio_node_drive_free_bytes`.

## Review Notes
The Kubernetes manifest is syntactically valid as a minimal example, but production Kubernetes deployments should generally use the MinIO Operator/Tenant model and include explicit Secret, PVC, namespace, resource, security, and upgrade settings. The Velero example uses plugin version `v1.9.0`; operators should choose the AWS plugin version compatible with their Velero release.
