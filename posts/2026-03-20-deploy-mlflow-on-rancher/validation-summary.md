# Validation Summary: How to Deploy MLflow on Rancher

## Status
validated

## Post Type
Tutorial / Deployment Guide

## Technologies Covered
- MLflow (v2.12.x) — tracking server, backend store, artifact store
- Rancher / Kubernetes
- Helm (Bitnami PostgreSQL chart)
- PostgreSQL (backend store)
- AWS S3 (artifact store)
- Kubernetes Deployment, Service, Ingress (networking.k8s.io/v1)
- NGINX Ingress Controller
- cert-manager (TLS via Let's Encrypt)
- Python (scikit-learn, mlflow client SDK)

## Sources Consulted
- MLflow 2.12 CLI documentation — https://mlflow.org/docs/2.12.0/cli.html
- MLflow GitHub releases (verified existing v2.x tags) — https://github.com/mlflow/mlflow/releases
- MLflow GHCR container image — https://github.com/mlflow/mlflow/pkgs/container/mlflow
- Bitnami PostgreSQL Helm chart parameters (`auth.postgresPassword`, `auth.database`)
- Kubernetes API references for `apps/v1` Deployment, `v1` Service, and `networking.k8s.io/v1` Ingress
- mlflow.sklearn.log_model API signature for MLflow 2.12

## Issues Found
- **MLflow image tag `v2.12.0` does not exist.** MLflow's v2.12.x release line started with v2.12.1 (published 2024-04-17); there was never a v2.12.0 release on GitHub or a corresponding container tag on `ghcr.io/mlflow/mlflow`. Updated the Deployment manifest to use `ghcr.io/mlflow/mlflow:v2.12.1` so the image actually pulls.

## Review Notes
- The official `ghcr.io/mlflow/mlflow` image installs only the base `mlflow` package. For the PostgreSQL backend store (`psycopg2`) and S3 artifact store (`boto3`) to work, those Python packages must be present. With the base image they typically come in via MLflow's optional dependencies, but readers running into `ModuleNotFoundError: psycopg2` or boto3 may need to build a custom image (e.g. `pip install mlflow[extras] psycopg2-binary boto3`). Not a correctness bug in the post, just a common gotcha worth knowing.
- Because `--default-artifact-root` is set without `--serve-artifacts`, MLflow clients write artifacts to S3 directly. That means data scientists running `training.py` also need AWS credentials (the post's `mlflow-s3-credentials` secret only covers the server). For a fully proxied setup, switching to `--artifacts-destination s3://...` with `--serve-artifacts` would centralize S3 access.
- The Python example imports `train_test_split` and references `X_train`/`y_train`/`X_test`/`y_test` without showing how they're constructed. This is a typical didactic shortcut for an MLflow logging snippet, not a technical error.
- `mlflow.sklearn.log_model(model, "random-forest-model")` uses the legacy positional `artifact_path` argument. It is valid in 2.12.x but was renamed/deprecated in MLflow 3.x in favor of `name=`. Consider revisiting if the post is updated to a 3.x image.
- The bitnami `postgresql` release name equals the chart name, so the Helm fullname template collapses to `postgresql`, making `postgresql.mlflow.svc.cluster.local` the correct in-cluster DNS name. Verified.
