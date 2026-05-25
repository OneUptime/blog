# Validation Summary: How to Create Azure Log Analytics Workspaces in Terraform

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Terraform
- HashiCorp AzureRM provider
- Azure Log Analytics workspaces
- Azure Monitor
- Azure Monitor Data Collection Rules
- Azure Monitor diagnostic settings
- Microsoft Sentinel
- Azure role-based access control
- Kusto Query Language (KQL)

## Sources Consulted
- HashiCorp AzureRM provider documentation: `azurerm_log_analytics_workspace` - https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/log_analytics_workspace
- HashiCorp AzureRM provider documentation: `azurerm_monitor_data_collection_rule` - https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/monitor_data_collection_rule
- HashiCorp AzureRM provider documentation: `azurerm_monitor_diagnostic_setting` - https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/monitor_diagnostic_setting
- HashiCorp AzureRM provider documentation: `azurerm_log_analytics_solution` - https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/log_analytics_solution
- HashiCorp AzureRM provider documentation: `azurerm_sentinel_log_analytics_workspace_onboarding` - https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/sentinel_log_analytics_workspace_onboarding
- HashiCorp AzureRM provider documentation: `azurerm_log_analytics_saved_search` - https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/log_analytics_saved_search
- Microsoft Learn: Manage data retention in a Log Analytics workspace - https://learn.microsoft.com/en-us/azure/azure-monitor/logs/data-retention-configure
- Microsoft Learn: Azure Monitor Logs cost calculations and options - https://learn.microsoft.com/en-us/azure/azure-monitor/logs/cost-logs
- Microsoft Learn: Data collection rules in Azure Monitor - https://learn.microsoft.com/en-us/azure/azure-monitor/data-collection/data-collection-rule-overview
- Microsoft Learn: Enable Azure Key Vault logging - https://learn.microsoft.com/en-us/azure/key-vault/general/howto-logging

## Issues Found
- Updated the AzureRM provider constraint from `~> 3.80` to `~> 4.0` so the examples target the current major provider series.
- Changed the diagnostic setting metric block from `metric` with `enabled = true` to `enabled_metric`, matching the current AzureRM provider schema.
- Replaced direct deployment of the `SecurityInsights` Log Analytics solution with `azurerm_sentinel_log_analytics_workspace_onboarding`, which is the current Terraform resource for enabling Microsoft Sentinel on a Log Analytics workspace.
- Corrected retention wording from "30 is free" to note that 31 days of analytics retention are included in the ingestion price, while Terraform workspace retention still supports 30-730 days.
- Clarified that DCRs work with Azure Monitor Agent and replace legacy Log Analytics agent configuration for supported VM data collection.
- Clarified prerequisites for the RBAC examples: creating role assignments requires Owner or User Access Administrator permissions, not only Contributor.

## Review Notes
The DCR snippet defines the data collection rule and destination, but a real VM rollout also needs Azure Monitor Agent installed and a data collection rule association for each target VM or VM set. Terraform was not installed in the local environment, so validation was performed against the current official provider and Microsoft documentation rather than by running `terraform validate`.
