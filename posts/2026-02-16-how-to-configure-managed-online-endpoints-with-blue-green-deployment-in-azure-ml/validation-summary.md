# Validation Summary: How to Configure Managed Online Endpoints with Blue-Green Deployment in Azure ML

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Machine Learning managed online endpoints
- Azure Machine Learning managed online deployments
- Azure CLI `ml` extension v2
- Azure Machine Learning Python SDK v2 (`azure-ai-ml`)
- YAML deployment configuration
- Python scoring scripts for online inference
- Azure Monitor metrics for online endpoints

## Sources Consulted
- Microsoft Learn: Safe rollout for online endpoints - https://learn.microsoft.com/en-us/azure/machine-learning/how-to-safely-rollout-online-endpoints?view=azureml-api-2
- Microsoft Learn: CLI (v2) managed online deployment YAML schema - https://learn.microsoft.com/en-us/azure/machine-learning/reference-yaml-deployment-managed-online?view=azureml-api-2
- Microsoft Learn: Deploy machine learning models to online endpoints - https://learn.microsoft.com/en-us/azure/machine-learning/how-to-deploy-online-endpoints?view=azureml-api-2
- Microsoft Learn: Model specification for online deployments - https://learn.microsoft.com/en-us/azure/machine-learning/concept-online-deployment-model-specification?view=azureml-api-2
- Microsoft Learn: `az ml online-endpoint` CLI reference - https://learn.microsoft.com/en-us/cli/azure/ml/online-endpoint?view=azure-cli-latest
- Microsoft Learn: `az ml online-deployment` CLI reference - https://learn.microsoft.com/en-us/cli/azure/ml/online-deployment?view=azure-cli-latest
- Microsoft Learn: Monitor online endpoints - https://learn.microsoft.com/en-us/azure/machine-learning/how-to-monitor-online-endpoints
- Microsoft Learn: `azure.ai.ml.operations.OnlineEndpointOperations` SDK reference - https://learn.microsoft.com/en-us/python/api/azure-ai-ml/azure.ai.ml.operations.onlineendpointoperations?view=azure-python
- Azure ML latest JSON schema: `managedOnlineDeployment.schema.json` - https://azuremlschemas.azureedge.net/latest/managedOnlineDeployment.schema.json

## Issues Found
- The registered model example used a nested `name` and `version` object where Microsoft's CLI v2 documentation recommends the `azureml:<model-name>:<model-version>` reference syntax for existing registered models. Updated the commented blue example and the green deployment snippet to use `azureml:fraud-detection-model:<version>`.
- The text said the CLI direct deployment test used a deployment-specific header. The CLI and SDK use deployment-specific parameters; the raw HTTP header is only for direct REST calls. Updated the wording to "deployment-specific option."
- The monitoring section labeled `az ml online-endpoint show` as a metrics command. That command shows endpoint details, not Azure Monitor metrics. Updated the text and comment to clarify that metrics are available through Azure Monitor and the command checks endpoint status and traffic configuration.
- The rollback section claimed the change takes effect "within seconds." The official docs support traffic rerouting but do not guarantee that timing. Reworded the sentence to avoid an unsupported timing guarantee while preserving the accurate point that rollback does not require recreating the blue deployment.

## Review Notes
The Azure CLI was not installed in the local environment, so CLI validation was performed against Microsoft Learn CLI reference documentation rather than local `az --help` output. Python code blocks were parsed successfully with `python3`, and YAML/JSON snippets were parsed successfully with PyYAML/JSON tooling after edits.
