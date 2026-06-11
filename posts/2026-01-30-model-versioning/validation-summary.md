# Validation Summary: How to Build Model Versioning

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Python
- Python dataclasses, datetime, pathlib, hashlib, pickle, subprocess
- importlib.metadata
- scikit-learn
- MLflow Model Registry
- Model versioning, artifact storage, metadata tracking, lineage tracking, and deployment promotion workflows

## Sources Consulted
- Python datetime documentation: https://docs.python.org/3/library/datetime.html
- Python importlib.metadata documentation: https://docs.python.org/3/library/importlib.metadata.html
- Setuptools pkg_resources deprecation documentation: https://setuptools.pypa.io/en/latest/deprecated/pkg_resources.html
- scikit-learn RandomForestClassifier documentation: https://scikit-learn.org/stable/modules/generated/sklearn.ensemble.RandomForestClassifier.html
- scikit-learn train_test_split documentation: https://scikit-learn.org/stable/modules/generated/sklearn.model_selection.train_test_split.html
- scikit-learn make_classification documentation: https://scikit-learn.org/stable/modules/generated/sklearn.datasets.make_classification.html
- scikit-learn accuracy_score documentation: https://scikit-learn.org/stable/modules/generated/sklearn.metrics.accuracy_score.html
- MLflow Model Registry documentation: https://mlflow.org/docs/latest/ml/model-registry/
- MLflow Model Registry workflow documentation: https://mlflow.org/docs/latest/ml/model-registry/workflow/
- MLflow Python client API documentation: https://mlflow.org/docs/latest/api_reference/python_api/mlflow.client.html
- MLflow scikit-learn API documentation: https://mlflow.org/docs/latest/python_api/mlflow.sklearn.html

## Issues Found
- Replaced `datetime.utcnow()` with `datetime.now(timezone.utc)` in model metadata and lineage examples because `datetime.utcnow()` is deprecated in Python 3.12 and returns a naive datetime.
- Replaced deprecated `pkg_resources.working_set` usage with `importlib.metadata.distributions()` for environment package capture.
- Updated the MLflow example to use model registry aliases instead of stage transitions because MLflow model registry stages and `transition_model_version_stage()` are deprecated as of MLflow 2.9.0.
- Replaced `mlflow.sklearn.log_model(..., artifact_path="model")` with `name="model"` because `artifact_path` is deprecated in current MLflow model logging APIs.
- Corrected the MLflow context-manager explanation so it says logged data is associated with the active run, rather than implying the context manager automatically tracks parameters, metrics, and artifacts.
- Added a missing `None` check in `validate_model_for_promotion()` so a missing model version returns a validation failure instead of raising `AttributeError`.
- Updated rollback selection to sort archived versions by `stage_updated_at`, matching the surrounding comment and making rollback choose the most recently archived version.

## Review Notes
The post's custom file-based registry is suitable as an educational example, but it is not concurrency-safe and does not implement storage deduplication despite discussing deduplication as a production concern. The Python examples were syntax-checked with `ast.parse`; scikit-learn and MLflow were not installed in the local environment, so runtime execution of those examples was not performed.
