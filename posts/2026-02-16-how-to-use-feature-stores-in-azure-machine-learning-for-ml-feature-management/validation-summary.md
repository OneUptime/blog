# Validation Summary: How to Use Feature Stores in Azure Machine Learning for ML Feature Management

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Machine Learning managed feature store
- Azure Machine Learning Python SDK v2 (`azure-ai-ml`)
- Azure ML feature store SDK (`azureml-featurestore`)
- Azure CLI `ml` extension
- Feature store entities and feature sets
- Feature set specification YAML
- Spark and PySpark transformations
- Offline and online feature materialization
- Azure Data Lake Storage Gen2
- Azure Cache for Redis
- Python

## Sources Consulted
- Azure Machine Learning managed feature store overview: https://learn.microsoft.com/en-us/azure/machine-learning/concept-what-is-managed-feature-store?view=azureml-api-2
- Managed feature store tutorial 1, feature set development and registration: https://learn.microsoft.com/en-us/azure/machine-learning/tutorial-get-started-with-feature-store?view=azureml-api-2
- Feature set specification YAML schema: https://learn.microsoft.com/en-us/azure/machine-learning/reference-yaml-featureset-spec?view=azureml-api-2
- Feature transformation concepts and best practices: https://learn.microsoft.com/en-us/azure/machine-learning/feature-set-specification-transformation-concepts?view=azureml-api-2
- Feature set materialization concepts: https://learn.microsoft.com/en-us/azure/machine-learning/feature-set-materialization-concepts?view=azureml-api-2
- Feature retrieval concepts for training and inference: https://learn.microsoft.com/en-us/azure/machine-learning/feature-retrieval-concepts?view=azureml-api-2
- Online materialization and inference tutorial: https://learn.microsoft.com/en-us/azure/machine-learning/tutorial-online-materialization-inference?view=azureml-api-2
- Azure ML `FeatureStore` Python API reference: https://learn.microsoft.com/en-us/python/api/azure-ai-ml/azure.ai.ml.entities.featurestore?view=azure-python
- Azure CLI `az ml feature-store` reference: https://learn.microsoft.com/en-us/cli/azure/ml/feature-store?view=azure-cli-latest
- Azure CLI `az ml feature-store-entity` reference: https://learn.microsoft.com/en-us/cli/azure/ml/feature-store-entity?view=azure-cli-latest

## Issues Found
- The feature store creation example configured a custom offline store using a storage-account ARM ID. Azure ML expects an ADLS Gen2 container ARM ID for a custom offline materialization store, and the Python API documents that a materialization identity is required when custom materialization stores are provided. Updated the target path and added a user-assigned managed identity placeholder.
- The online store ARM path used a lower-case Redis resource type segment. Updated it to the documented `Microsoft.Cache/Redis` resource type format.
- The feature transformation example used a plain Python function. Azure ML feature transformations expect a Spark ML `Transformer` class referenced as `{module_name}.{class_name}`. Replaced the function with a `CustomerTransactionFeatureTransformer` class implementing `_transform`.
- The original transformation aggregated only by customer and did not preserve the source timestamp column required by the feature set specification. Updated it to produce rolling 30-day customer features and return the `transaction_timestamp` column.
- The feature set YAML referenced a single transformation Python file and function. Updated it to reference a transformation code folder and transformer class, and added `source_lookback` and `temporal_join_lookback` for the rolling time-window features.
- The feature set YAML used `mltable` with an `azureml://datastores/...` path even though the documented feature set source schema supports Azure storage and ABFS paths. Updated the example to a Parquet source using an `abfss://` path.
- Several feature types were too narrow for Spark aggregate outputs. Updated floating aggregates to `double` and count-like aggregates to `long`.
- The materialization example used a compute SKU casing that differs from the documented examples and omitted `data_status` in the SDK backfill call. Updated the instance type and added `DataAvailabilityStatus.NONE` with `datetime` window values.
- The training example used a pandas DataFrame and a nonexistent `FeatureStoreClient.feature(...)` helper. Updated it to use a Spark DataFrame, retrieve the registered feature set, select features with `get_feature()`, and pass them to `get_offline_features()`.
- The feature store core SDK client examples used `workspace_name`; the documented constructor uses `name` for the feature store name. Updated those examples.
- The online serving example called `get_online_features()` with unsupported `feature_set`, `entity_key`, and `feature_names` arguments. Updated it to resolve feature URIs, call `init_online_lookup()`, and pass a PyArrow observation table to `get_online_features()`.
- Added `pyarrow` to the install command because the corrected online lookup example uses a PyArrow table, matching Microsoft’s online lookup tutorial pattern.

## Review Notes
The tutorial remains a condensed walkthrough and still assumes an Azure ML Spark environment where `spark`, Azure credentials, storage, Redis, RBAC assignments, and source data already exist. Azure Cache for Redis is still documented for managed feature store online materialization, but Microsoft has announced a retirement timeline for Azure Cache for Redis SKUs and recommends migration planning to Azure Managed Redis.
