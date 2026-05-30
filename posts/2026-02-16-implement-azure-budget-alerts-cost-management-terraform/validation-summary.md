# Validation Summary: How to Implement Azure Budget Alerts and Cost Management with Terraform

## Status
validated

## Post Type
Tutorial / Implementation Guide

## Technologies Covered
- Azure Cost Management
- Azure Consumption budgets
- Azure Monitor Action Groups
- Azure Policy
- Terraform
- HashiCorp AzureRM provider
- Azure AzAPI provider

## Sources Consulted
- HashiCorp AzureRM provider documentation for `azurerm_consumption_budget_subscription`: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/consumption_budget_subscription
- HashiCorp AzureRM provider documentation for `azurerm_consumption_budget_resource_group`: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/consumption_budget_resource_group
- HashiCorp AzureRM provider documentation for `azurerm_monitor_action_group`: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/monitor_action_group
- HashiCorp AzureRM provider documentation for `azurerm_subscription_cost_management_export`: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/subscription_cost_management_export
- Microsoft Learn ARM/Bicep/Terraform AzAPI reference for `Microsoft.CostManagement/scheduledActions`: https://learn.microsoft.com/en-us/azure/templates/microsoft.costmanagement/2023-09-01/scheduledactions
- Microsoft Learn documentation for Cost Management cost alerts and anomaly alerts: https://learn.microsoft.com/en-us/azure/cost-management-billing/costs/cost-mgt-alerts-monitor-usage-spending
- Microsoft Learn documentation for unexpected cost changes and anomaly alerts: https://learn.microsoft.com/en-us/azure/cost-management-billing/understand/analyze-unexpected-charges
- Microsoft Learn Azure Policy built-in policy list: https://learn.microsoft.com/en-us/azure/governance/policy/samples/built-in-policies
- Azure built-in policy definition for "Require a tag on resources": https://github.com/Azure/azure-policy/blob/master/built-in-policies/policyDefinitions/Tags/RequireTag_Deny.json

## Issues Found
- The cost anomaly alert example used `azurerm_monitor_metric_alert` with `Microsoft.CostManagement/externalBillingAccounts` and `BillingCurrency`, which is not a valid Azure Monitor metric alert configuration for Cost Management anomaly detection. Replaced it with an AzAPI `Microsoft.CostManagement/scheduledActions` `InsightAlert`, using the documented scheduled action API and the `ms:DailyAnomalyByResourceGroup` Cost Management view.
- The anomaly alert explanation said Terraform could set up metric alerts for cost spikes. Updated the text to clarify that the AzureRM provider does not expose a dedicated anomaly alert resource and that the Scheduled Actions API can be managed through AzAPI.
- The Azure Policy built-in policy definition ID for "Require a tag on resources" had an incorrect GUID segment. Corrected it to `/providers/Microsoft.Authorization/policyDefinitions/871b6d14-10aa-478d-b590-94f262ecfa99`.
- The `azurerm_subscription_cost_management_export` example used invalid argument names `recurrence_period_start` and `recurrence_period_end`. Updated them to `recurrence_period_start_date` and `recurrence_period_end_date`, matching the AzureRM provider schema.

## Review Notes
- The post pins AzureRM to `~> 3.80`. The reviewed resources are still represented in current AzureRM documentation, but future maintenance should consider testing against AzureRM 4.x because provider authentication and some behavior differ across major versions.
- The examples reference surrounding resources such as resource groups, storage containers, and function apps that are not fully defined in the post. That is acceptable for a focused guide, but readers will need to provide those resources in a complete Terraform configuration.
