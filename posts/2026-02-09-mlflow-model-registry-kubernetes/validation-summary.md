# Validation Summary: How to Deploy MLflow Model Registry and Tracking Server on Kubernetes

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- Kubernetes
- MLflow Tracking Server
- MLflow Model Registry
- PostgreSQL
- MinIO
- NGINX Ingress
- Prometheus Operator ServiceMonitor
- Python
- scikit-learn

## Sources Consulted
- MLflow Tracking Server documentation: https://mlflow.org/docs/latest/self-hosting/architecture/tracking-server/
- MLflow CLI documentation for `mlflow server`, `--default-artifact-root`, `--expose-prometheus`, and environment variables: https://mlflow.org/docs/latest/api_reference/cli.html
- MLflow artifact store documentation for S3-compatible storage and `MLFLOW_S3_ENDPOINT_URL`: https://mlflow.org/docs/2.11.3/tracking/artifacts-stores.html
- MLflow Model Registry workflow documentation for aliases and deprecated stages: https://www.mlflow.org/docs/latest/ml/model-registry/workflow/
- MLflow Python client API documentation for `set_registered_model_alias` and `get_model_version_by_alias`: https://mlflow.org/docs/latest/python_api/mlflow.client.html
- MinIO Client documentation for `mc alias` and `mc anonymous`: https://minio.github.io/mc/
- MinIO releases for valid server image tags: https://github.com/minio/minio/releases
- Kubernetes Ingress documentation for `ingressClassName` and the deprecated ingress class annotation: https://kubernetes.io/docs/concepts/services-networking/ingress
- Prometheus Operator design documentation for ServiceMonitor service selection: https://prometheus-operator.dev/docs/getting-started/design/

## Issues Found
- The MinIO server image tag used `RELEASE.2024-01-01T00-00-00Z`, which does not match the official MinIO release timestamp format for that date. Updated it to `RELEASE.2024-01-01T16-36-33Z`.
- The MinIO bucket command used the old `mc policy set download` form and made the artifact bucket publicly downloadable. Replaced it with `mc anonymous set private`, matching current MinIO client commands and keeping MLflow artifacts private because MLflow uses configured S3 credentials.
- The MLflow registry examples used deprecated model stages through `transition_model_version_stage`, `current_stage`, and stage-based model URIs. Updated the examples to use model aliases with `set_registered_model_alias`, `get_model_version_by_alias`, and `models:/<name>@Champion`.
- The deployment pipeline polled the deprecated Production stage with `get_latest_versions(..., stages=["Production"])`. Updated it to deploy the version referenced by the `Champion` alias.
- The Ingress used the deprecated `kubernetes.io/ingress.class` annotation. Replaced it with `spec.ingressClassName: nginx`.
- The ServiceMonitor selected Services with `app: mlflow-server`, but the `mlflow-server` Service had no matching metadata label. Added the label to the Service manifest.
- The ServiceMonitor scraped `/metrics`, but the MLflow server manifest did not enable the Prometheus exporter. Added `MLFLOW_EXPOSE_PROMETHEUS` to the MLflow ConfigMap.

## Review Notes
The tutorial remains a functional Kubernetes deployment guide, but the PostgreSQL and MinIO examples each run a single replica, so future revisions should avoid calling the full stack highly available unless replicated or externally managed storage is added.
