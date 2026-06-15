# Validation Summary: How to Implement Model Registry

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- MLflow Model Registry
- MLflow Python APIs
- Python
- SQLite
- Amazon S3 via Boto3
- Model lineage and serving patterns

## Sources Consulted
- MLflow Model Registry Workflows: https://mlflow.org/docs/latest/ml/model-registry/workflow/
- MLflow Client API: https://mlflow.org/docs/latest/api_reference/python_api/mlflow.client.html
- MLflow scikit-learn API: https://mlflow.org/docs/latest/api_reference/python_api/mlflow.sklearn.html
- MLflow pyfunc API: https://mlflow.org/docs/latest/api_reference/python_api/mlflow.pyfunc.html
- Python sqlite3 documentation: https://docs.python.org/3/library/sqlite3.html
- Boto3 S3 upload_file documentation: https://docs.aws.amazon.com/boto3/latest/reference/services/s3/client/upload_file.html

## Issues Found
- MLflow stage APIs were deprecated. Replaced the stage-management example with alias management using `set_registered_model_alias()` and `get_model_version_by_alias()`, and updated serving to load `models:/<name>@champion`.
- `mlflow.sklearn.log_model()` used the deprecated `artifact_path` argument. Updated it to use `name="model"` and added explicit imports matching current MLflow examples.
- The model serving snippet used deprecated `get_latest_versions()` and imported unused `lru_cache`. Updated it to resolve the champion alias and removed the unused import.
- The model serving usage called `predict()` immediately after constructing the server, but the original implementation only loaded the model from a background thread. Added an initial synchronous update check before starting the refresh thread.
- The lineage snippet referenced `Dict` and `ModelRegistry` without importing them. Added the missing imports.
- `record_lineage()` only modified tags in memory, so the lineage would not be available on later reads. Added an `update_tags()` method to the custom registry and used it to persist lineage tags.
- `compare_versions()` treated zero-valued metrics as missing because it checked truthiness. Updated the delta and percentage calculations to distinguish `0` from `None`.
- The architecture diagram and summary table still referred to stage management. Updated those references to alias management to match current MLflow guidance.

## Review Notes
The custom registry remains an illustrative implementation rather than a complete production system. Future improvements could add transaction handling around S3 upload and metadata writes, uniqueness rules for production status in the custom registry, and more specific exception handling around MLflow alias lookups.
