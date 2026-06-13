# Validation Summary: How to Get Started with MLflow for ML Lifecycle

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MLflow Tracking
- MLflow Model Registry
- MLflow Models and model serving
- MLflow Projects
- Python
- scikit-learn
- pandas and NumPy
- Docker and Docker Compose
- Kubernetes
- PostgreSQL
- MinIO / S3-compatible artifact storage

## Sources Consulted
- MLflow Model Registry documentation: https://mlflow.org/docs/latest/ml/model-registry/
- MLflow Model Registry workflow and stage migration documentation: https://mlflow.org/docs/latest/ml/model-registry/workflow/
- MLflow scikit-learn API reference: https://mlflow.org/docs/latest/api_reference/python_api/mlflow.sklearn.html
- MLflow local model serving documentation: https://mlflow.org/docs/latest/ml/deployment/deploy-model-locally/
- MLflow Projects documentation: https://mlflow.org/docs/latest/ml/projects/
- MLflow CLI reference: https://mlflow.org/docs/latest/api_reference/cli.html
- MLflow tracking server and artifact store documentation: https://mlflow.org/docs/latest/self-hosting/architecture/tracking-server/
- scikit-learn Pipeline documentation: https://scikit-learn.org/stable/modules/generated/sklearn.pipeline.Pipeline.html

## Issues Found
- The Model Registry examples used deprecated MLflow model stages (`Staging`, `Production`, `Archived`) and `MlflowClient.transition_model_version_stage()`. MLflow deprecated model stages in 2.9.0 and recommends model aliases for deployment references. Updated the registry workflow to use `MlflowClient.set_registered_model_alias()` with `candidate` and `champion` aliases.
- Model loading, serving, Docker, Kubernetes, and batch inference examples referenced stage-based URIs such as `models:/churn-prediction-model/Production`. Updated them to alias-based URIs such as `models:/churn-prediction-model@champion`.
- The training example scaled features before training but logged only the classifier, while later serving and batch examples sent raw feature values. Updated the training code to log a scikit-learn `Pipeline` containing both `StandardScaler` and the classifier, so local evaluation, serving, and batch inference use the same preprocessing.
- Feature importance logging previously generated generic feature names from the scaled NumPy array. After preserving DataFrame inputs for the logged pipeline, updated the artifact to use the original feature column names.

## Review Notes
- The Python snippets were statically parsed for syntax with Python 3. MLflow was not installed in the local environment, so runtime execution of MLflow APIs was not performed.
- The Kubernetes manifest is a valid multi-document YAML example; the single-document YAML parser check reports multiple documents unless parsed with a multi-document loader.
- The Docker Compose example uses development credentials and anonymous bucket download permissions for demonstration. A production deployment should use real secrets management and tighter MinIO/S3 bucket policy.
