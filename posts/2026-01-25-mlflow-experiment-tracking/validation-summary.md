# Validation Summary: How to Set Up MLflow for Experiment Tracking

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MLflow Tracking
- MLflow Model Registry
- MLflow Python API
- scikit-learn
- matplotlib
- PostgreSQL backend store
- S3-compatible artifact storage
- Kubernetes

## Sources Consulted
- MLflow Tracking Quickstart: https://mlflow.org/docs/latest/ml/tracking/quickstart/
- MLflow Remote Experiment Tracking with Tracking Server: https://mlflow.org/docs/latest/ml/tracking/tutorials/remote-server/
- MLflow Tracking Server architecture: https://mlflow.org/docs/latest/self-hosting/architecture/tracking-server/
- MLflow Backend Stores: https://mlflow.org/docs/latest/self-hosting/architecture/backend-store/
- MLflow Artifact Stores: https://mlflow.org/docs/latest/self-hosting/architecture/artifact-store/
- MLflow Python API, `mlflow.sklearn`: https://mlflow.org/docs/latest/api_reference/python_api/mlflow.sklearn.html
- MLflow Python API, fluent tracking functions: https://mlflow.org/docs/latest/python_api/mlflow.html
- MLflow Model Registry documentation: https://mlflow.org/docs/latest/ml/model-registry/
- MLflow Model Registry workflow and stages migration note: https://mlflow.org/docs/latest/ml/model-registry/workflow/
- MLflow official Docker image documentation: https://mlflow.org/docs/latest/ml/docker/
- Kubernetes container command and argument variable expansion: https://kubernetes.io/docs/reference/kubernetes-api/core/pod-v1/
- PyPI MLflow release metadata: https://pypi.org/project/mlflow/

## Issues Found
- The Model Registry description referenced stage transitions as a primary current capability. MLflow has deprecated model registry stages since 2.9.0, so this was changed to versioning, aliases, metadata, and annotations.
- The install command only installed `mlflow`, but the tutorial snippets import scikit-learn and matplotlib. The install command now includes `scikit-learn` and `matplotlib`.
- The scikit-learn model logging snippet used the positional model path argument, which maps to the deprecated `artifact_path` parameter in current MLflow. It now uses `name="model"`.
- The remote tracking server command used `--default-artifact-root` for a proxied S3 artifact setup. Current MLflow guidance uses `--artifacts-destination` for server-proxied artifact uploads, so the command was updated and the unused local artifact directory creation was removed.
- The Kubernetes manifest used the outdated MLflow `2.10.0` image and the same outdated artifact flag. It now pins the current `v3.13.0` image, installs PostgreSQL/S3 dependencies at startup, and starts the server with `--artifacts-destination`.
- The autologging snippet called PyTorch, TensorFlow, and XGBoost autologging functions as executable code without installing those frameworks and used undefined training variables. The snippet now provides a runnable scikit-learn autologging example and leaves other framework integrations as commented examples.

## Review Notes
- All Python snippets were parsed with `ast.parse` after edits and are syntactically valid.
- The Kubernetes example is still a concise tutorial manifest. For production, building a custom MLflow image with required database and artifact-store dependencies would be preferable to installing packages at container startup.
