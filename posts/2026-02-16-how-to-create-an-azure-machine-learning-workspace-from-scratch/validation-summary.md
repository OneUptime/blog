# Validation Summary: How to Create an Azure Machine Learning Workspace from Scratch

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Machine Learning workspaces
- Azure Portal
- Azure CLI with the Azure ML `ml` extension
- Azure Machine Learning Python SDK v2 (`azure-ai-ml`)
- Azure Identity (`DefaultAzureCredential`)
- Terraform AzureRM provider
- Azure Storage, Key Vault, Container Registry, and Application Insights
- Azure RBAC and managed identities

## Sources Consulted
- Microsoft Learn: Manage Azure Machine Learning workspaces by using Azure CLI: https://learn.microsoft.com/en-us/azure/machine-learning/how-to-manage-workspace-cli?view=azureml-api-2
- Microsoft Learn: Manage Azure Machine Learning workspaces in the portal or with the Python SDK (v2): https://learn.microsoft.com/en-us/azure/machine-learning/how-to-manage-workspace?view=azureml-api-2
- Microsoft Learn Python SDK reference: `azure.ai.ml.operations.WorkspaceOperations.begin_create`: https://learn.microsoft.com/en-us/python/api/azure-ai-ml/azure.ai.ml.operations.workspaceoperations?view=azure-python
- Microsoft Learn Python SDK reference: `azure.ai.ml.entities.Workspace`: https://learn.microsoft.com/en-us/python/api/azure-ai-ml/azure.ai.ml.entities.workspace?view=azure-python
- Microsoft Learn: Create datastores in Azure Machine Learning: https://learn.microsoft.com/en-us/azure/machine-learning/how-to-datastore?view=azureml-api-2
- Microsoft Learn: Manage access to an Azure Machine Learning workspace: https://learn.microsoft.com/en-us/azure/machine-learning/how-to-assign-roles?view=azureml-api-2
- Microsoft Learn: Azure Resource Manager naming rules for Azure Machine Learning workspaces: https://learn.microsoft.com/en-us/azure/azure-resource-manager/management/resource-name-rules
- Terraform Registry: `azurerm_machine_learning_workspace`: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/machine_learning_workspace.html
- Terraform Registry: `azurerm_application_insights`: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/application_insights

## Issues Found
1. **Missing Terraform data source**: The Terraform example referenced `data.azurerm_client_config.current.tenant_id` when creating the Key Vault, but did not define the `azurerm_client_config` data source. Added `data "azurerm_client_config" "current" {}` so the configuration is syntactically complete.

2. **Outdated datastore wording for SDK/CLI v2 context**: The post said additional datastores can connect to Azure SQL Database. Current Azure ML v2 datastore documentation focuses on supported storage services such as Azure Blob Storage, Azure Data Lake Storage Gen2, Azure Files, and OneLake. Updated the wording to list supported storage services instead of Azure SQL Database.

## Review Notes
- The Azure CLI workspace creation command and flags are consistent with current Azure ML CLI v2 documentation. The pinned extension version `2.22.0` is old, but the command syntax shown remains valid; using `az extension add --name ml` without a pinned version would be preferable for new readers.
- The Python SDK v2 example uses the current `azure.ai.ml` `MLClient`, `Workspace`, and `begin_create(...).result()` pattern.
- The Terraform `azurerm_machine_learning_workspace` resource arguments shown match the current AzureRM provider documentation.
- Terraform was not installed in the review environment, so Terraform validation was performed against official provider documentation rather than by running `terraform validate`.
