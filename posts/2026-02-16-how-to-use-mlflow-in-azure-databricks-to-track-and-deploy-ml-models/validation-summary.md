# Validation Summary: How to Use MLflow in Azure Databricks to Track and Deploy ML Models

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MLflow Tracking
- MLflow Models
- MLflow Model Registry
- Azure Databricks
- Unity Catalog
- Databricks Model Serving
- Apache Spark and Spark UDFs
- scikit-learn
- Delta Lake tables
- Python

## Sources Consulted
- Azure Databricks MLflow tracking documentation: https://learn.microsoft.com/en-us/azure/databricks/mlflow/tracking
- Azure Databricks MLflow model logging, loading, and registration documentation: https://learn.microsoft.com/en-us/azure/databricks/mlflow/models
- Azure Databricks Unity Catalog model lifecycle documentation: https://learn.microsoft.com/en-us/azure/databricks/mlflow/models-in-uc-example
- Azure Databricks Mosaic AI Model Serving documentation: https://learn.microsoft.com/en-us/azure/databricks/machine-learning/model-serving/
- Databricks serving endpoint query API reference: https://docs.databricks.com/api/workspace/servingendpoints/query
- MLflow scikit-learn API reference: https://mlflow.org/docs/latest/api_reference/python_api/mlflow.sklearn.html
- MLflow pyfunc API reference: https://mlflow.org/docs/latest/api_reference/python_api/mlflow.pyfunc.html
- MLflow Model Registry documentation: https://mlflow.org/docs/latest/ml/model-registry
- MLflow model signatures documentation: https://mlflow.org/docs/latest/ml/model/signatures/
- MLflow autologging documentation: https://mlflow.org/docs/latest/ml/tracking/autolog/

## Issues Found
- The examples used `mlflow.sklearn.log_model(..., artifact_path="model")` and a positional model path. In current MLflow, `artifact_path` is deprecated for model logging. Updated examples to use `name="model"`.
- Unity Catalog model registration requires model signatures. Added `infer_signature` and passed `signature=signature` when logging scikit-learn models.
- The registration example used a `runs:/.../model` URI, which is the older MLflow 2.x pattern and can be incorrect for MLflow 3 logged models. Updated the examples to capture `model_info.model_uri`, store it as a run tag, and register from that URI.
- The experiment path used `/Experiments/...`, which is not the documented workspace experiment path pattern. Updated it to `/Shared/customer-churn-prediction`.
- The lifecycle management section used `transition_model_version_stage`, but model stages are deprecated in MLflow and are not supported for Unity Catalog models. Updated the section to use Unity Catalog aliases and tags with `set_registered_model_alias` and `set_model_version_tag`.
- The inference and Spark UDF examples loaded `models:/customer-churn-model/Production`, which uses a legacy stage URI. Updated them to load the Unity Catalog model by alias with `models:/production.ml_models.customer_churn@Champion`.
- The autologging section said feature importances are automatically logged. MLflow's scikit-learn autologging documents automatic logging of parameters, training score, model artifacts, and supported post-training metrics, not a general feature-importance artifact. Updated the claim.
- The wrap-up and component description referred to stage-based promotion as the primary lifecycle flow. Updated the prose to describe aliases, tags, and legacy stages accurately.

## Review Notes
The post assumes it is run in an Azure Databricks notebook or job where `spark`, the referenced Unity Catalog schemas, Delta tables, and `feature_columns` already exist. Those are environment prerequisites rather than syntax errors. The endpoint invocation payload format using `dataframe_records` matches the Databricks serving endpoint API for custom model scoring.
