# Validation Summary: Use AutoML in Azure Machine Learning to Find the Best Classification Model

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Machine Learning
- Azure Machine Learning Python SDK v2 (`azure-ai-ml`)
- Azure ML AutoML classification
- MLTable
- MLflow
- Managed online endpoints

## Sources Consulted
- Microsoft Learn: Set up AutoML training for tabular data with the Azure Machine Learning CLI and Python SDK, https://learn.microsoft.com/en-us/azure/machine-learning/how-to-configure-auto-train?view=azureml-api-2
- Microsoft Learn: `azure.ai.ml.automl.ClassificationJob` API reference, https://learn.microsoft.com/en-us/python/api/azure-ai-ml/azure.ai.ml.automl.classificationjob?view=azure-python
- Microsoft Learn: `azure.ai.ml.automl.ClassificationModels` enum reference, https://learn.microsoft.com/en-us/python/api/azure-ai-ml/azure.ai.ml.automl.classificationmodels?view=azure-python
- Microsoft Learn: Work with registered models in Azure Machine Learning, https://learn.microsoft.com/en-us/azure/machine-learning/how-to-manage-models?view=azureml-api-2
- Microsoft Learn: Deploy MLflow models to online endpoints, https://learn.microsoft.com/en-us/azure/machine-learning/how-to-deploy-mlflow-models-online-endpoints?view=azureml-api-2
- Microsoft Learn: `ManagedOnlineEndpoint` API reference, https://learn.microsoft.com/en-us/python/api/azure-ai-ml/azure.ai.ml.entities.managedonlineendpoint?view=azure-python
- Microsoft Learn: `ManagedOnlineDeployment` API reference, https://learn.microsoft.com/en-us/python/api/azure-ai-ml/azure.ai.ml.entities.managedonlinedeployment?view=azure-python
- Azure official examples: AutoML classification task bank marketing notebook, https://github.com/Azure/azureml-examples/blob/main/sdk/python/jobs/automl-standalone-jobs/automl-classification-task-bankmarketing/automl-classification-task-bankmarketing.ipynb

## Issues Found
- The prerequisites said AutoML runs on clusters, not compute instances. Microsoft documentation states SDK v2 AutoML jobs are supported on remote compute clusters or compute instances. Updated the prerequisite to allow both, while recommending clusters for parallel trials.
- The data example registered a raw CSV as `AssetTypes.URI_FILE` and passed it directly to AutoML. Current SDK v2 tabular AutoML documentation recommends MLTable inputs. Updated the example to create and register an MLTable folder with `AssetTypes.MLTABLE`.
- The training algorithm list used raw string names. Updated the example to import and use the SDK's `ClassificationModels` enum values for supported classification algorithms.
- The result analysis code attempted to read child job properties such as `score` and `run_algorithm` through `ml_client.jobs.list`. Official AutoML examples retrieve the best child run and metrics through MLflow. Updated the code to configure MLflow tracking, read the `automl_best_child_run_id` tag, and sort child runs by `metrics.AUC_weighted`.
- The model registration path pointed to `azureml://jobs/{submitted_job.name}/outputs/best_model`, which is not the path used in current official AutoML SDK v2 examples. Updated it to register the MLflow model from the best child run path: `outputs/artifacts/outputs/mlflow-model`.
- The endpoint deployment example used a fixed endpoint name and did not route traffic to the deployment. Updated it to use a unique endpoint name and assign 100% traffic to the new deployment.

## Review Notes
The corrected tutorial uses current Azure ML SDK v2 patterns. The code was not executed against an Azure workspace because this review environment does not have Azure credentials or the Azure SDK installed.
