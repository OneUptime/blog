# Validation Summary: How to Deploy MinIO for ML Model Storage via Portainer

## Status
validated

## Post Type
Tutorial / Step-by-step deployment guide

## Technologies Covered
- MinIO (S3-compatible object storage)
- Portainer (Docker stack management)
- Docker / Docker Compose
- mc (MinIO client CLI)
- Python boto3 (AWS SDK)
- MLflow (artifact storage integration)

## Sources Consulted
- MinIO official docs — Container deployment & root credentials: https://min.io/docs/minio/container/index.html
- MinIO mc client reference: https://min.io/docs/minio/linux/reference/minio-mc.html
- `mc ilm rule add`: https://min.io/docs/minio/linux/reference/minio-mc/mc-ilm-rule-add.html
- `mc ilm tier add`: https://min.io/docs/minio/linux/reference/minio-mc/mc-ilm-tier-add.html
- MinIO health check endpoints: https://min.io/docs/minio/linux/operations/monitoring/healthcheck-probe.html
- MLflow tracking with S3-compatible artifact store: https://mlflow.org/docs/latest/tracking/artifacts-stores.html
- boto3 S3 client docs: https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/s3.html

## Issues Found
1. **Wrong flag name on `mc ilm rule add` for expiration.** The post used `--expiry-days 90`. The correct flag in current MinIO mc is `--expire-days`. Fixed in `Step 4`.
2. **Invalid transition flag and storage class usage.** The post used `--transition-storage-class GLACIER` directly on `mc ilm rule add`. That flag does not exist, and you cannot pass `GLACIER` directly as a transition target in MinIO — transitions reference a remote tier created beforehand with `mc ilm tier add`. Replaced with the correct two-step flow: create the tier with `mc ilm tier add s3 local GLACIER_TIER ... --storage-class GLACIER`, then `mc ilm rule add --transition-days 30 --transition-tier GLACIER_TIER local/ml-models`.

## Review Notes
- MinIO image pin (`RELEASE.2024-01-31T20-20-33Z`) is a real release tag and works, but readers deploying in 2026 may want a newer release for security fixes; not changed since the post is intentionally version-pinned.
- Healthcheck endpoint `/minio/health/live` and env vars `MINIO_ROOT_USER`/`MINIO_ROOT_PASSWORD` are correct and current.
- boto3 client config (`signature_version="s3v4"`, dummy `region_name`) is the standard pattern for MinIO and is correct.
- MLflow snippet uses `mlflow.sklearn.log_model(model, "model", ...)` with the positional `artifact_path` argument. This still works in MLflow 2.x; in MLflow 3.x the keyword `name=` is preferred but the positional form remains supported, so no change required.
- The `minio-init` `entrypoint` overrides the default `mc` entrypoint by invoking `/bin/sh -c`, which is correct for `minio/mc` images.
