# Validation Summary: How to Configure MinIO Object Storage on Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MinIO (server, Operator, Tenant CRD, mc client)
- Talos Linux
- Kubernetes (Deployment, Service, PVC, Ingress, Secret)
- Helm
- S3 API
- cert-manager / nginx ingress
- Webhook event notifications

## Sources Consulted
- MinIO Operator Helm chart docs: https://docs.min.io/enterprise/aistor-object-store/installation/kubernetes/install/
- MinIO Operator GitHub: https://github.com/minio/operator
- Tenant CRD example: https://github.com/minio/operator/blob/master/examples/kustomization/base/tenant.yaml
- mc admin command reference: https://docs.min.io/enterprise/aistor-object-store/reference/cli/admin/
- mc anonymous set reference: https://docs.min.io/community/minio-object-store/reference/minio-mc/mc-anonymous-set.html
- mc admin policy reference: https://docs.min.io/community/minio-object-store/reference/minio-mc/mc-admin-policy.html
- mc admin logs reference: https://docs.min.io/community/minio-object-store/reference/minio-mc/mc-admin-logs.html

## Issues Found
No technical issues found.

Verifications performed:
- Helm repo URL `https://operator.min.io` and chart reference `<alias>/operator` are correct (the post uses `minio-operator` as the local repo alias, which is valid — only the alias name is local).
- Tenant CRD `apiVersion: minio.min.io/v2` is the current API version used in the upstream operator examples.
- Tenant spec fields (`pools`, `servers`, `volumesPerServer`, `volumeClaimTemplate`, `mountPath`, `requestAutoCert`, `users`, `configuration`) match the current operator schema.
- `config.env` secret format with shell-style `export` statements for `MINIO_ROOT_USER` / `MINIO_ROOT_PASSWORD` is the documented format.
- Users secret keys `CONSOLE_ACCESS_KEY` / `CONSOLE_SECRET_KEY` match the operator-expected keys.
- Standalone MinIO command `minio server /data --console-address ":9001"` and health endpoints `/minio/health/live` / `/minio/health/ready` are correct.
- mc commands verified: `mc alias set`, `mc mb`, `mc ls`, `mc anonymous set download` (current replacement for `mc policy set`), `mc admin user add`, `mc admin policy attach --user=` (current replacement for `mc admin policy set`), `mc admin info`, `mc admin prometheus generate`, `mc admin logs`, `mc du`, `mc admin service restart`.
- Webhook notification ARN format `arn:minio:sqs::<identifier>:webhook` and config keys `endpoint`, `queue_dir`, `queue_limit` match the documented webhook target configuration.
- `mc event add ... --event put,delete` event selector syntax is correct.

## Review Notes
- The post pins `quay.io/minio/minio:latest` for the standalone deployment and `image: quay.io/minio/minio:latest` in the Tenant. Production deployments should pin to a specific release tag for reproducibility, but this is a stylistic/operational recommendation rather than a technical error.
- The standalone single-node deployment uses `replicas: 1` with a `ReadWriteOnce` PVC — correct for a single-node setup, but cannot be scaled horizontally without switching to the distributed Tenant model.
- The Prerequisites mention "at least 4 worker nodes (for distributed mode)" which aligns with MinIO's minimum erasure-coding requirement of 4 drives; combined with `volumesPerServer: 2` on 4 servers, the example yields 8 drives, comfortably above the minimum.
- The password `changeme123456` meets MinIO's minimum 8-character requirement for `MINIO_ROOT_PASSWORD`.
