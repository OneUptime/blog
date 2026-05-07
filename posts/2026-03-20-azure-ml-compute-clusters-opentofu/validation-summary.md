# Validation Summary: How to Create Azure ML Compute Clusters with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu
- Microsoft Azure
- Azure Machine Learning
- AzureRM provider
- HCL
- Azure Machine Learning compute clusters
- Azure Machine Learning compute instances

## Sources Consulted
- OpenTofu `init` command: https://opentofu.org/docs/cli/commands/init/
- OpenTofu `plan` command: https://opentofu.org/docs/cli/commands/plan/
- OpenTofu `apply` command: https://opentofu.org/docs/cli/commands/apply/
- AzureRM `azurerm_machine_learning_workspace` resource: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/machine_learning_workspace
- AzureRM `azurerm_machine_learning_compute_cluster` resource: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/machine_learning_compute_cluster
- AzureRM `azurerm_machine_learning_compute_instance` resource: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/machine_learning_compute_instance
- AzureRM `azurerm_key_vault` resource: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/key_vault
- Azure Machine Learning workspace concepts: https://learn.microsoft.com/en-us/azure/machine-learning/concept-workspace?view=azureml-api-2
- Azure Machine Learning compute cluster creation: https://learn.microsoft.com/en-us/azure/machine-learning/how-to-create-attach-compute-cluster?view=azureml-api-2
- Azure Machine Learning compute instance concepts: https://learn.microsoft.com/en-us/azure/machine-learning/concept-compute-instance?view=azureml-api-2
- Azure Machine Learning workspace management with CLI: https://learn.microsoft.com/en-us/azure/machine-learning/how-to-manage-workspace-cli?view=azureml-api-2
- Azure Monitor Application Insights creation: https://learn.microsoft.com/en-us/azure/azure-monitor/app/create-workspace-resource

## Issues Found
- The HCL referenced `data.azurerm_client_config.current` in the Key Vault and compute instance examples, but the data source was never declared. I added `data "azurerm_client_config" "current" {}` so the configuration is internally consistent.
- The post omitted the required AzureRM provider configuration. I added `provider "azurerm" { features {} }`, which the AzureRM provider requires even for a default configuration.
- The snippets used `var.location`, `var.environment`, `var.app_name`, `var.developer_alias`, and `var.developer_object_id` without declaring those input variables. I added the missing `variable` blocks so `tofu plan` can prompt for values instead of failing on undeclared variables.

## Review Notes
- Omitting `container_registry_id` is valid here. Current Azure Machine Learning documentation says a workspace can exist without ACR and Azure Machine Learning creates a container registry later when it first needs one.
- `azurerm_application_insights` without an explicit `workspace_id` is still valid, but current Azure Monitor behavior creates a workspace-based Application Insights resource backed by a managed Log Analytics workspace.
- The example VM sizes and `LowPriority` usage are syntactically correct, but actual deployment still depends on regional SKU availability and subscription quota.
- I did not run a live `tofu plan` or `tofu apply`, because the article requires real Azure credentials, user-supplied variable values, and subscription-specific quota.
