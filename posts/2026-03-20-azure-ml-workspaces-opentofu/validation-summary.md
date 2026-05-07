# Validation Summary: How to Deploy Azure Machine Learning Workspaces with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu / Terraform-style HCL
- Azure Resource Manager (`azurerm` provider)
- Azure AzAPI provider
- Azure Machine Learning workspaces
- Azure Machine Learning compute clusters
- Azure Machine Learning managed online endpoints
- Azure Container Registry
- Azure RBAC

## Sources Consulted
- AzureRM provider docs: `azurerm_machine_learning_workspace`  
  https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/machine_learning_workspace
- AzureRM provider docs: `azurerm_machine_learning_compute_cluster`  
  https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/machine_learning_compute_cluster
- Azure built-in roles for AI + machine learning  
  https://learn.microsoft.com/en-us/azure/role-based-access-control/built-in-roles/ai-machine-learning
- Azure Machine Learning online endpoint authentication  
  https://learn.microsoft.com/en-us/azure/machine-learning/how-to-authenticate-online-endpoint?view=azureml-api-2
- ARM/AzAPI reference: `Microsoft.MachineLearningServices/workspaces/onlineEndpoints`  
  https://learn.microsoft.com/en-us/azure/templates/microsoft.machinelearningservices/2025-12-01/workspaces/onlineendpoints
- Azure Container Registry SKU features and limits  
  https://learn.microsoft.com/en-us/azure/container-registry/container-registry-skus
- Azure Container Registry Private Link  
  https://learn.microsoft.com/en-us/azure/container-registry/container-registry-private-link

## Issues Found
- The ACR block said Premium was required for Azure ML workspace integration and set `admin_enabled = false`. Current AzureRM workspace docs instead note that the associated registry should have `admin_enabled = true`, and Premium is only needed for features such as Private Link. I changed the comment and set `admin_enabled = true`.
- The training compute cluster `ssh` block was invalid because the provider requires `admin_username` plus either `admin_password` or `key_value`. I added `key_value = var.compute_cluster_ssh_public_key`.
- The post used `azurerm_machine_learning_online_endpoint`, which is not a current first-class AzureRM resource. I replaced that snippet with an `azapi_resource` example using the official `Microsoft.MachineLearningServices/workspaces/onlineEndpoints@2025-12-01` resource type and the correct `authMode` / `publicNetworkAccess` properties.

## Review Notes
- The RBAC role names `AzureML Data Scientist` and `AzureML Compute Operator` are current Azure built-in role names.
- The compute cluster values `vm_priority = "Dedicated"` and `vm_priority = "LowPriority"` are current valid AzureRM values.
- Microsoft documents `aad_token` / `AADToken` as the strongest authentication mode for production managed online endpoints. The post now uses a technically valid endpoint definition, but the example still keeps key auth to stay close to the original content.
