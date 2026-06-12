# Validation Summary: How to Use MLflow for Experiment Tracking

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MLflow Tracking
- MLflow Tracking Server and UI
- MLflow Model Registry
- Python
- scikit-learn
- PyTorch and PyTorch Lightning
- XGBoost
- PostgreSQL, SQLite, and S3 artifact storage

## Sources Consulted
- MLflow Tracking documentation: https://mlflow.org/docs/latest/ml/tracking/
- MLflow Tracking APIs and fluent API reference: https://mlflow.org/docs/latest/python_api/mlflow.html
- MLflow CLI reference: https://mlflow.org/docs/latest/cli.html
- MLflow scikit-learn API reference: https://mlflow.org/docs/latest/python_api/mlflow.sklearn.html
- MLflow PyTorch API reference: https://mlflow.org/docs/latest/python_api/mlflow.pytorch.html
- MLflow XGBoost API reference: https://mlflow.org/docs/latest/python_api/mlflow.xgboost.html
- MLflow Client API reference: https://mlflow.org/docs/latest/python_api/mlflow.client.html
- MLflow Model Registry documentation: https://mlflow.org/docs/latest/ml/model-registry/
- MLflow Model Registry workflow documentation: https://mlflow.org/docs/latest/ml/model-registry/workflow/
- MLflow backend store documentation: https://mlflow.org/docs/latest/self-hosting/architecture/backend-store/
- MLflow artifact store documentation: https://mlflow.org/docs/latest/self-hosting/architecture/artifact-store/

## Issues Found
- Updated MLflow model logging examples to use the current `name` parameter instead of deprecated `artifact_path` for `mlflow.sklearn.log_model()` and `mlflow.pytorch.log_model()`.
- Replaced Model Registry stage-transition guidance with alias-based lifecycle management. MLflow documentation now recommends aliases such as `champion`; model stages are deprecated and scheduled for removal in a future major release.
- Replaced registered-model loading by `latest` and stage names with alias-based loading using `models:/<model-name>@champion`, matching current Model Registry URI guidance.
- Added explicit flavor imports (`mlflow.sklearn`, `mlflow.pytorch`, and `mlflow.xgboost`) to snippets that call flavor-specific APIs directly.
- Fixed the registration example so it captures `run_id` from the active `with mlflow.start_run(...) as run` context before the run exits.
- Adjusted the alias example to select the highest numeric model version instead of assuming `search_model_versions()` returns versions in newest-first order.

## Review Notes
The local file-based tracking workflow remains supported, but MLflow documentation notes that file-based backend storage is in maintenance mode and recommends database-backed tracking for newer deployments and team workflows.
