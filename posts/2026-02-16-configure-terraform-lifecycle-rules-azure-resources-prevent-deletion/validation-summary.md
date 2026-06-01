# Validation Summary: How to Configure Terraform Lifecycle Rules for Azure Resources to Prevent

## Status
validated

## Post Type
Guide

## Technologies Covered
- Terraform lifecycle meta-arguments
- Terraform precondition and postcondition blocks
- AzureRM Terraform Provider
- Azure SQL Database
- Azure Storage Account
- Azure Key Vault
- Azure Cosmos DB
- Azure Cache for Redis
- Azure Kubernetes Service
- Azure Virtual Machine Scale Sets
- Azure Resource Groups
- Azure Public IP
- Azure App Service Plan

## Sources Consulted
- HashiCorp Terraform lifecycle meta-argument reference: https://developer.hashicorp.com/terraform/language/meta-arguments/lifecycle
- HashiCorp Terraform custom conditions documentation: https://developer.hashicorp.com/terraform/language/expressions/custom-conditions
- AzureRM Provider `azurerm_storage_account` documentation: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/storage_account
- AzureRM Provider `azurerm_kubernetes_cluster` documentation: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/kubernetes_cluster
- AzureRM Provider `azurerm_mssql_database` documentation: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/mssql_database
- AzureRM Provider `azurerm_linux_virtual_machine_scale_set` documentation: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/linux_virtual_machine_scale_set
- AzureRM Provider `azurerm_key_vault` documentation: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/key_vault
- AzureRM Provider `azurerm_cosmosdb_account` documentation: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/cosmosdb_account
- AzureRM Provider `azurerm_redis_cache` documentation: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/redis_cache
- AzureRM Provider `azurerm_public_ip` documentation: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/public_ip
- AzureRM Provider `azurerm_service_plan` documentation: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/service_plan
- AzureRM Provider `azurerm_resource_group` documentation: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/resource_group

## Issues Found
- The post described Terraform as providing only three lifecycle meta-arguments. Terraform supports additional lifecycle rules, including `replace_triggered_by`, `precondition`, and `postcondition`, so the wording was changed to describe `prevent_destroy`, `create_before_destroy`, and `ignore_changes` as the three most common rules.
- The `prevent_destroy` explanation implied it blocks every possible plan that destroys a resource. Terraform only enforces it while the lifecycle rule remains in the configuration, so the explanation was narrowed to match the official lifecycle behavior.
- The AKS example used `enable_auto_scaling`, which is the old AzureRM argument name. It was updated to the current `auto_scaling_enabled` argument.
- The storage account postcondition used `self.enable_https_traffic_only`, which has been superseded in current AzureRM provider versions. It was updated to `self.https_traffic_only_enabled`, and the example now explicitly sets `https_traffic_only_enabled = true`.
- The module example declared `protect_from_deletion` but could not use it in `prevent_destroy`, because lifecycle settings require literal values. The unused variable and misleading conditional lifecycle comments were removed.

## Review Notes
The examples are illustrative snippets and assume surrounding resources and variables exist, such as resource groups, SQL servers, client configuration data sources, subnets, and SSH keys. `create_before_destroy` still requires careful naming and dependency handling for Azure resources with unique-name constraints.
