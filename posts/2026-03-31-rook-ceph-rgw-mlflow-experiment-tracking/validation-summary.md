# Validation Summary: How to Use Ceph RGW with MLflow for Experiment Tracking

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook-Ceph (RGW / RADOS Gateway)
- MLflow v2.11.0 (Tracking Server, Python Client)
- Kubernetes (Deployment manifest)
- PostgreSQL (MLflow backend store)
- AWS CLI (S3-compatible bucket creation)
- Python (MLflow SDK, PyTorch integration)

## Sources Consulted
- MLflow official documentation: tracking server CLI flags, Python API (`log_params`, `log_metric`, `log_model`, `log_artifact`, `MlflowClient`, `search_runs`)
- MLflow architecture documentation: backend store vs artifact store separation
- Kubernetes apps/v1 Deployment spec requirements (pod template labels must match selector)
- Ceph radosgw-admin CLI reference (`user create`, `user info` subcommands and flags)
- AWS CLI S3 `mb` command reference

## Issues Found

### 1. Missing pod template labels in Kubernetes Deployment YAML
**What was wrong:** The Deployment spec defined `selector.matchLabels: {app: mlflow}` but the pod `template` section was missing `metadata.labels`. Kubernetes requires pod template labels to match the selector; without them, `kubectl apply` would reject the manifest with a validation error.

**What was changed:** Added `metadata.labels.app: mlflow` under `template` to match the selector.

### 2. Inaccurate claim about metrics storage location
**What was wrong:** The summary stated "All experiment artifacts, model checkpoints, and metrics are stored in Ceph." In MLflow's architecture, metrics and parameters are stored in the backend store (PostgreSQL in this setup), not in the artifact store (S3/Ceph). Only artifacts (files, model checkpoints, plots) are stored in S3.

**What was changed:** Updated the summary to clarify that artifacts and model checkpoints are stored in Ceph, while metrics and parameters remain in the PostgreSQL backend store.

## Review Notes
- The MLflow Docker image tag `v2.11.0` should be verified against the actual tags published to `ghcr.io/mlflow/mlflow`. Some MLflow releases use the `v` prefix and some may not; the exact tag availability should be confirmed.
- The Python training example sets S3 credentials directly via `os.environ` with placeholder values. When using `--serve-artifacts` on the tracking server (as configured), clients can proxy artifact operations through the server, which means client-side S3 credentials may not be needed. The post could note this but it is not incorrect as shown.
- All MLflow Python API calls (`log_params`, `log_metric`, `pytorch.log_model`, `log_artifact`, `MlflowClient`, `search_runs`) use correct signatures and parameter names for MLflow 2.x.
- The `radosgw-admin` commands and AWS CLI S3 commands are syntactically correct.
