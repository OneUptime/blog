# Validation Summary: How to Implement Responsible AI Dashboards in Azure Machine Learning

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Machine Learning
- Azure Machine Learning Python SDK v2
- Responsible AI dashboard and RAI pipeline components
- ResponsibleAI / raiwidgets
- MLflow model format
- MLTable data assets
- scikit-learn

## Sources Consulted
- Azure Machine Learning: Generate Responsible AI insights with YAML and Python: https://learn.microsoft.com/en-us/azure/machine-learning/how-to-responsible-ai-insights-sdk-cli?view=azureml-api-2
- Azure Machine Learning: Use the Responsible AI dashboard in Azure Machine Learning studio: https://learn.microsoft.com/en-us/azure/machine-learning/how-to-responsible-ai-dashboard?view=azureml-api-2
- Azure Machine Learning: Working with tables in Azure Machine Learning: https://learn.microsoft.com/en-us/azure/machine-learning/how-to-mltable?view=azureml-api-2
- Azure Machine Learning: Create and manage data assets: https://learn.microsoft.com/en-us/azure/machine-learning/how-to-create-data-assets?view=azureml-api-2
- Azure SDK for Python: MLClient class: https://learn.microsoft.com/en-us/python/api/azure-ai-ml/azure.ai.ml.mlclient?view=azure-python
- MLflow sklearn API documentation: https://mlflow.org/docs/latest/api_reference/python_api/mlflow.sklearn.html
- Microsoft Responsible AI Toolbox capabilities: https://responsibleaitoolbox.ai/responsible-ai-toolbox-capabilities/

## Issues Found
- The prerequisites incorrectly allowed generic scikit-learn, LightGBM, or XGBoost models for the Azure ML RAI component flow. Azure ML documents that tabular RAI components require models registered in MLflow format with an sklearn flavor, so the prerequisite was corrected.
- The training example used raw categorical string columns directly with `GradientBoostingClassifier`, which would fail in scikit-learn. The model code now uses a `ColumnTransformer`, `OneHotEncoder`, and `Pipeline`.
- The model was saved with `joblib` and registered as `AssetTypes.CUSTOM_MODEL`, but Azure ML RAI components require an MLflow model input. The post now saves with `mlflow.sklearn.save_model()` and registers the model as `AssetTypes.MLFLOW_MODEL`.
- The Azure ML data assets were registered as `URI_FILE` CSVs, but the documented RAI component input requirement is MLTable tabular data. The example now writes train/test CSVs into MLTable folders and registers them as `AssetTypes.MLTABLE`.
- The RAI built-in components were fetched from the workspace client. The examples now use an Azure ML registry client for the `azureml` registry, matching the documented component registry pattern.
- The Step 5 pipeline inputs used `AssetTypes.URI_FILE`; these were corrected to `AssetTypes.MLTABLE`.
- The post said local RAI output was saved for upload to Azure ML, but the Azure ML section generates the dashboard through pipeline components. The wording now says the saved output is for local inspection.
- The causal analysis explanation overstated the strength of observational causal estimates. It now states that causal effects are estimated under the assumptions of the causal model.

## Review Notes
The corrected snippets are syntactically valid Python. The post still uses placeholder workspace, compute, subscription, and dataset values, which is appropriate for a tutorial but means the examples require user-specific Azure resources before they can run end to end.
