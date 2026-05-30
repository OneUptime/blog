# Validation Summary: How to Use Terraform Data Sources to Reference Existing Azure Resources

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform
- HashiCorp AzureRM provider
- Azure Resource Manager
- Azure Resource Groups
- Azure Virtual Network and Subnet
- Azure Key Vault
- Azure App Service / Linux Web App
- Azure Container Registry
- Azure Log Analytics
- Azure Monitor diagnostic settings

## Sources Consulted
- HashiCorp Terraform data sources documentation: https://developer.hashicorp.com/terraform/language/data-sources
- HashiCorp Terraform sensitive data documentation: https://developer.hashicorp.com/terraform/language/manage-sensitive-data
- AzureRM provider `azurerm_resource_group` data source documentation: https://github.com/hashicorp/terraform-provider-azurerm/blob/main/website/docs/d/resource_group.html.markdown
- AzureRM provider `azurerm_virtual_network` data source documentation: https://github.com/hashicorp/terraform-provider-azurerm/blob/main/website/docs/d/virtual_network.html.markdown
- AzureRM provider `azurerm_subnet` data source documentation: https://github.com/hashicorp/terraform-provider-azurerm/blob/main/website/docs/d/subnet.html.markdown
- AzureRM provider `azurerm_key_vault` and `azurerm_key_vault_secret` data source documentation: https://github.com/hashicorp/terraform-provider-azurerm/blob/main/website/docs/d/key_vault_secret.html.markdown
- AzureRM provider `azurerm_client_config` data source documentation: https://github.com/hashicorp/terraform-provider-azurerm/blob/main/website/docs/d/client_config.html.markdown
- AzureRM provider `azurerm_service_plan` data source documentation: https://github.com/hashicorp/terraform-provider-azurerm/blob/main/website/docs/d/service_plan.html.markdown
- AzureRM provider `azurerm_container_registry` data source documentation: https://github.com/hashicorp/terraform-provider-azurerm/blob/main/website/docs/d/container_registry.html.markdown
- AzureRM provider `azurerm_log_analytics_workspace` and `azurerm_storage_account` data source documentation: https://github.com/hashicorp/terraform-provider-azurerm/blob/main/website/docs/d/log_analytics_workspace.html.markdown
- AzureRM provider `azurerm_resources` data source documentation: https://github.com/hashicorp/terraform-provider-azurerm/blob/main/website/docs/d/resources.html.markdown
- AzureRM provider `azurerm_monitor_diagnostic_setting` resource documentation: https://github.com/hashicorp/terraform-provider-azurerm/blob/main/website/docs/r/monitor_diagnostic_setting.html.markdown
- AzureRM provider `azurerm_key_vault` resource documentation: https://github.com/hashicorp/terraform-provider-azurerm/blob/main/website/docs/r/key_vault.html.markdown

## Issues Found
- Corrected the claim that data sources create "no state file bloat." Terraform records data source results in state, so the post now says data sources do not take lifecycle ownership of the existing resource.
- Clarified data source evaluation timing. Terraform often reads data sources during refresh and planning, but official documentation notes reads can be deferred to apply when arguments depend on values unknown during planning.
- Replaced the "resource group moves" example with a cross-environment reuse example because a resource group's location is not something Terraform treats as a normal mutable property.
- Added an `azurerm_service_plan` data source to the App Service example and changed `service_plan_id` to reference it, so the snippet no longer points at an undeclared `azurerm_service_plan.main` resource.
- Added `data "azurerm_client_config" "current" {}` to the combined data sources example because that snippet uses `data.azurerm_client_config.current.tenant_id`.
- Updated the diagnostic setting example from `metric` to `enabled_metric` to match the current AzureRM provider documentation.
- Corrected the pitfall suggesting `try()` can work around a missing Azure data source. `try()` cannot catch provider read failures; the post now describes conditional declaration as the relevant pattern when the read should be skipped.

## Review Notes
The Key Vault secret example is technically valid, but storing a secret value in App Service app settings through Terraform means the value can be persisted in Terraform state and should be protected accordingly. The post already calls this out.
