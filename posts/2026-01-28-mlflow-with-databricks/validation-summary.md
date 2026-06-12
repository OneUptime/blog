# Validation Summary: How to Use MLflow with Databricks

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MLflow
- Databricks
- Unity Catalog
- Databricks Feature Engineering / Feature Store
- Databricks Model Serving
- Databricks SDK for Python
- Databricks Jobs
- Apache Spark / PySpark ML
- Python
- scikit-learn
- PyTorch

## Sources Consulted
- Databricks MLflow tracking documentation: https://docs.databricks.com/aws/en/mlflow/tracking
- Databricks MLflow on Databricks documentation: https://docs.databricks.com/aws/en/mlflow
- Databricks Models in Unity Catalog lifecycle documentation: https://docs.databricks.com/aws/en/machine-learning/manage-model-lifecycle/
- Databricks Feature Engineering / Feature Store training documentation: https://docs.databricks.com/aws/en/machine-learning/feature-store/train-models-with-feature-store
- Databricks custom Model Serving endpoint creation documentation: https://docs.databricks.com/aws/en/machine-learning/model-serving/create-manage-serving-endpoints
- Databricks custom Model Serving query documentation: https://docs.databricks.com/aws/en/machine-learning/model-serving/score-custom-model-endpoints
- Databricks SDK for Python serving endpoints documentation: https://databricks-sdk-py.readthedocs.io/en/latest/workspace/serving/serving_endpoints.html
- Databricks SDK for Python serving dataclasses documentation: https://databricks-sdk-py.readthedocs.io/en/latest/dbdataclasses/serving.html
- Databricks SDK for Python jobs documentation: https://databricks-sdk-py.readthedocs.io/en/latest/workspace/jobs/jobs.html
- MLflow scikit-learn API documentation: https://mlflow.org/docs/latest/python_api/mlflow.sklearn.html
- MLflow Spark API documentation: https://mlflow.org/docs/latest/python_api/mlflow.spark.html
- MLflow PySpark ML autologging documentation: https://mlflow.org/docs/latest/python_api/mlflow.pyspark.ml.html
- MLflow autologging documentation: https://mlflow.org/docs/latest/ml/tracking/autolog/

## Issues Found
- The Feature Store example used Unity Catalog-style three-level table names but imported the legacy `FeatureStoreClient` and omitted `FeatureLookup`. Updated it to use `FeatureEngineeringClient` and import `FeatureLookup`, matching current Databricks guidance for Feature Engineering in Unity Catalog.
- The same feature-engineering example logged a registered model as `recommendation_model`, which is ambiguous for Unity Catalog. Updated it to `ml.production.recommendation_model`, matching Unity Catalog's `catalog.schema.model` naming pattern.
- The Model Serving SDK example used `ServedModelInput` with `served_models`, while current Databricks SDK examples use `ServedEntityInput` with `served_entities` and `entity_name` / `entity_version`. Updated the snippet accordingly.
- The scheduled training job example evaluated against `test_df` without defining it. Added a train/test split and trained on `train_df` before evaluating on `test_df`.

## Review Notes
The examples still use placeholders such as `spark`, `labels_df`, `train_model`, `evaluate_model`, `workspace_url`, `token`, and `run_id`, which is acceptable for a tutorial but would need concrete definitions in runnable notebooks or scripts. For Spark ML model registration in Unity Catalog, production code should ensure a model signature is logged, as Databricks requires signatures for new Unity Catalog model versions.
