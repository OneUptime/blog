# Validation Summary: How to Track Experiments with MLflow in Azure Machine Learning

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Machine Learning
- MLflow Tracking
- Azure ML MLflow plugin
- Python
- scikit-learn
- pandas
- matplotlib

## Sources Consulted
- Microsoft Learn: MLflow and Azure Machine Learning, https://learn.microsoft.com/en-us/azure/machine-learning/concept-mlflow?view=azureml-api-2
- Microsoft Learn: Log metrics, parameters, and files with MLflow, https://learn.microsoft.com/en-us/azure/machine-learning/how-to-log-view-metrics?view=azureml-api-2
- Microsoft Learn: Log MLflow models, https://learn.microsoft.com/en-us/azure/machine-learning/how-to-log-mlflow-models?view=azureml-api-2
- Microsoft Learn: Manage models registry with MLflow, https://learn.microsoft.com/en-us/azure/machine-learning/how-to-manage-models-mlflow?view=azureml-api-2
- Microsoft Learn: Configure Azure Machine Learning MLflow tracking URI examples, https://learn.microsoft.com/en-us/azure/machine-learning/how-to-use-mlflow-azure-databricks?view=azureml-api-2
- MLflow documentation: mlflow.sklearn API, https://mlflow.org/docs/latest/api_reference/python_api/mlflow.sklearn.html

## Issues Found
- The post said every Azure ML workspace has a built-in MLflow tracking server. Microsoft documentation states that Azure ML workspaces are MLflow-compatible and can be used as the tracking target, but Azure ML does not host separate MLflow server instances. Updated the wording to say every workspace exposes an MLflow tracking URI.
- The post did not mention the required `azureml-mlflow` plugin. Added a short prerequisite and install command.
- Azure Machine Learning currently documents compatibility with MLflow 2.16.x or earlier for model logging because later MLflow artifact and LoggedModels API changes are not supported by `azureml-mlflow`. Added the version pin in the install command.
- The scikit-learn model logging example passed the artifact path positionally. Changed it to `artifact_path="model"` to match Azure ML's documented MLflow 2.16-compatible API style more explicitly.

## Review Notes
- The MLflow tracking, parameter logging, metric logging, artifact logging, autologging, run querying, step metrics, and model registration examples align with official Azure ML and MLflow documentation.
- The sample code assumes the placeholder dataset exists and contains a binary `churn` label with features already encoded into scikit-learn-compatible numeric values.
