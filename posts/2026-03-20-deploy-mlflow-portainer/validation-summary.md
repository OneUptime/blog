# Validation Summary: How to Deploy MLflow via Portainer

## Status
validated

## Post Type
Tutorial / Deployment Guide

## Technologies Covered
- MLflow (v2.11.0)
- Portainer (Docker stack management)
- Docker / Docker Compose
- PostgreSQL 16 (metadata backend store)
- MinIO (S3-compatible artifact store)
- Python (scikit-learn integration)
- MLflow Model Registry

## Sources Consulted
- MLflow CLI reference: https://mlflow.org/docs/latest/cli.html
- MLflow 2.11.0 release notes: https://github.com/mlflow/mlflow/releases/tag/v2.11.0
- MLflow Tracking Server self-hosting docs: https://mlflow.org/docs/latest/self-hosting/architecture/tracking-server/
- MLflow Artifact Stores docs: https://mlflow.org/docs/latest/tracking/artifacts-stores
- MLflow Model Registry docs (incl. stage deprecation RFC): https://github.com/mlflow/mlflow/issues/10336
- MLflow GHCR container registry: https://github.com/mlflow/mlflow/pkgs/container/mlflow (verified `v2.11.0` tag exists via Docker registry API)
- MinIO image documentation: https://hub.docker.com/r/minio/minio
- MinIO `mc` client docs: https://min.io/docs/minio/linux/reference/minio-mc.html

## Issues Found
1. **Incorrect MLflow CLI flag for the artifact store.** The original Compose file used `--artifact-root s3://mlflow-artifacts` in the `mlflow server` command. The correct flag (per the official MLflow CLI reference for 2.x) is `--default-artifact-root`. With the wrong flag, `mlflow server` fails to start. Fixed by updating the command to `--default-artifact-root s3://mlflow-artifacts`.

## Review Notes
- **Model stage transitions are deprecated (but still functional).** As of MLflow 2.9, the model registry "stages" workflow — including `MlflowClient.transition_model_version_stage` — has been deprecated in favor of model version aliases (`set_registered_model_alias` / `get_model_version_by_alias`) and tags. The Step 3 example using `transition_model_version_stage(..., stage="Production")` still works in MLflow 2.11.0 (it emits a `DeprecationWarning`), so the post is technically correct for the pinned version, but a future update may want to switch to aliases for forward compatibility.
- **`mlflow models serve --env-manager conda`** is valid in 2.11.0. Other accepted values are `virtualenv` and `local`. Note that `conda` requires Conda to be installed in the serving container/environment.
- **Compose `version: "3.8"`** is now considered obsolete by Docker Compose v2 (the top-level `version` key is ignored), but it does not cause errors and is harmless. Left as-is.
- **`depends_on` without `condition: service_healthy`** does not wait for Postgres/MinIO to be ready; MLflow may need to retry on first startup. With `restart: unless-stopped` this typically self-heals, so the stack remains workable.
- **MinIO image pin (`RELEASE.2024-01-31T20-20-33Z`)** is a valid tag and consistent with the post's pinning approach.
- **Security note (informational, not a fix):** the example uses hardcoded credentials (`mlflow_pw`, `minio_access`, `minio_secret`) for clarity. Any real deployment should source these from Portainer secrets / environment overrides rather than committing them to the stack file.
