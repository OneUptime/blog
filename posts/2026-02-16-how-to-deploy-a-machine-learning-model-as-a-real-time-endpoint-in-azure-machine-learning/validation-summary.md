# Validation Summary: How to Deploy a Machine Learning Model as a Real-Time Endpoint

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Machine Learning managed online endpoints
- Azure Machine Learning SDK v2 for Python (`azure-ai-ml`)
- Azure Identity (`DefaultAzureCredential`)
- Azure CLI `ml` extension
- Azure Monitor autoscale
- Azure Machine Learning endpoint monitoring and data collection
- Python scoring scripts, Conda environments, and REST/cURL inference

## Sources Consulted
- Azure Machine Learning: Deploy and score a machine learning model by using an online endpoint: https://learn.microsoft.com/en-us/azure/machine-learning/how-to-deploy-online-endpoints?view=azureml-api-2
- Azure Machine Learning: Autoscale online endpoints in Azure Machine Learning: https://learn.microsoft.com/en-us/azure/machine-learning/how-to-autoscale-endpoints?view=azureml-api-2
- Azure Machine Learning: Monitor online endpoints: https://learn.microsoft.com/en-us/azure/machine-learning/how-to-monitor-online-endpoints?view=azureml-api-2
- Azure Machine Learning monitoring data reference: https://learn.microsoft.com/en-us/azure/machine-learning/monitor-azure-machine-learning-reference?view=azureml-api-2
- Azure Machine Learning: Collect production data from models for real-time inferencing: https://learn.microsoft.com/en-us/azure/machine-learning/how-to-collect-production-data?view=azureml-api-2
- Azure Machine Learning: Authenticate clients for online endpoints: https://learn.microsoft.com/en-us/azure/machine-learning/how-to-authenticate-online-endpoint?view=azureml-api-2
- Azure CLI reference: `az ml online-endpoint`: https://learn.microsoft.com/en-us/cli/azure/ml/online-endpoint?view=azure-cli-latest
- Azure CLI reference: `az ml online-deployment`: https://learn.microsoft.com/en-us/cli/azure/ml/online-deployment?view=azure-cli-latest
- Azure SDK for Python: `OnlineEndpointOperations.invoke`: https://learn.microsoft.com/en-us/python/api/azure-ai-ml/azure.ai.ml.operations.onlineendpointoperations?view=azure-python
- Azure SDK for Python: `ProbeSettings`: https://learn.microsoft.com/en-us/python/api/azure-ai-ml/azure.ai.ml.entities.probesettings?view=azure-python
- Azure SDK for Python: `DataCollector` and `DeploymentCollection`: https://learn.microsoft.com/en-us/python/api/azure-ai-ml/azure.ai.ml.entities.datacollector?view=azure-python and https://learn.microsoft.com/en-us/python/api/azure-ai-ml/azure.ai.ml.entities.deploymentcollection?view=azure-python

## Issues Found
- The Python SDK invocation example used `input=json.dumps(sample_data)`. Current `OnlineEndpointOperations.invoke` documents this argument as `input_data`, so the example was updated to `input_data=json.dumps(sample_data)`.
- The cURL setup commands omitted `--resource-group` and `--workspace-name`, which are required unless Azure CLI defaults are already configured. The commands now include the workspace values used elsewhere in the post.
- The autoscaling example used a literal placeholder ARM path and only created a scale-out rule, despite saying the deployment scales down when idle. The example now retrieves the deployment ARM ID with `az ml online-deployment show` and adds a matching scale-in rule.
- The monitoring section implied that enabling `model_inputs` and `model_outputs` data collection alone logs custom model input/output data for drift detection. Azure ML requires either reserved `request`/`response` payload logging or scoring-script `Collector` objects for custom tabular collections. The snippet now enables payload logging and notes the `azureml-ai-monitoring`/`Collector` requirement for custom tabular model monitoring.

## Review Notes
The post is technically relevant and remains a valid Azure Machine Learning managed online endpoint tutorial after the fixes. Some examples still use placeholder subscription, workspace, model, and feature values that readers must replace for their environment.
