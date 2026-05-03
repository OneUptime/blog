# Validation Summary: How to Deploy MLflow on Rancher - A Practical Guide

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MLflow v2.9.2 (tracking server, model registry, Python client, CLI)
- Rancher / Kubernetes (Deployments, Services, Ingress)
- PostgreSQL 15 (backend store)
- S3 / MinIO (artifact store)
- NGINX Ingress Controller (basic auth annotations)
- scikit-learn (GradientBoostingClassifier example)
- Python (training and model promotion scripts)

## Sources Consulted
- MLflow v2.9.2 source: https://github.com/mlflow/mlflow/tree/v2.9.2
  - `mlflow/cli.py` (server flags)
  - `mlflow/experiments.py` (experiments subcommands)
  - `mlflow/runs.py` (runs subcommand flags)
  - `mlflow/server/__init__.py` (`/health` endpoint)
  - `mlflow/tracking/client.py` (deprecation decorators)
  - `mlflow/sklearn/__init__.py` (`log_model` signature)
- MLflow CHANGELOG (deprecation/removal of `list` APIs in 2.0.0)
- MLflow Docker images on GHCR: https://github.com/mlflow/mlflow/pkgs/container/mlflow
- Kubernetes Ingress v1 API: https://kubernetes.io/docs/concepts/services-networking/ingress/
- ingress-nginx auth annotations: https://kubernetes.github.io/ingress-nginx/examples/auth/basic/

## Issues Found

1. **Invalid CLI command `mlflow experiments list`** (Monitoring section).
   - The `list` subcommand for `mlflow experiments` was removed in MLflow 2.0.0 in favor of `search`. In MLflow 2.9.2 only `mlflow experiments search` exists. Verified in `mlflow/experiments.py` line 50 and the 2.0.0 CHANGELOG (#6785-#6868).
   - Fixed by replacing with `mlflow experiments search`.

2. **Invalid flag `--experiment-name` on `mlflow runs list`** (Monitoring section).
   - `mlflow runs list` only accepts `--experiment-id` (required), not `--experiment-name`. Verified in `mlflow/runs.py` lines 26-33.
   - Fixed by changing the flag to `--experiment-id 1` and adding a brief note that the ID comes from the search above.

## Review Notes
- `client.transition_model_version_stage()` and `client.get_latest_versions()` used in Step 5 are both deprecated as of MLflow 2.9.0 (decorated with `@deprecated(since="2.9.0", impact=_STAGES_DEPRECATION_WARNING)` in `mlflow/tracking/client.py`). They still function in 2.9.2 — and the post's reference to "Staging"/"Production" stages is consistent with that API — but the model-stages workflow is being replaced by model aliases. The code in the post will work but emits deprecation warnings, and is likely to break in MLflow 3.x. A future revision could migrate to `set_registered_model_alias` / `get_model_version_by_alias`.
- The PostgreSQL deployment uses a `Deployment` (with PVC) rather than a `StatefulSet`. This works for a single replica but a `StatefulSet` would be more idiomatic. Stylistic, not incorrect.
- The official MLflow image at `ghcr.io/mlflow/mlflow:v2.9.2` does not bundle `psycopg2`/`boto3` by default in some past releases; users hitting `ModuleNotFoundError` on first run would need a custom image with `psycopg2-binary` and `boto3`. Not a code error in the post, but a likely operational gotcha.
- `--workers=4` for `mlflow server` works on Linux (gunicorn) but is silently ignored on Windows (waitress). Not an issue inside a Linux container.
- The Kubernetes manifests are syntactically valid for `apps/v1` Deployments and `networking.k8s.io/v1` Ingress, which is the current (non-deprecated) API in the Kubernetes versions Rancher ships.
