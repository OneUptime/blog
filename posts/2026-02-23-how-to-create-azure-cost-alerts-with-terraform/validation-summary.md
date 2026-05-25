# Validation Summary: How to Create Azure Cost Alerts with Terraform

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform
- HashiCorp AzureRM provider
- Azure Cost Management budgets
- Azure Cost Management anomaly alerts
- Azure Monitor action groups

## Sources Consulted
- Terraform Registry: `azurerm_consumption_budget_subscription` - https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/consumption_budget_subscription
- Terraform Registry: `azurerm_consumption_budget_resource_group` - https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/consumption_budget_resource_group
- Terraform Registry: `azurerm_monitor_action_group` - https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/monitor_action_group
- Terraform Registry: `azurerm_cost_anomaly_alert` - https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/cost_anomaly_alert
- Microsoft Learn: Use cost alerts to monitor usage and spending - https://learn.microsoft.com/azure/cost-management-billing/costs/cost-mgt-alerts-monitor-usage-spending
- Microsoft Learn: Identify anomalies and unexpected changes in cost - https://learn.microsoft.com/azure/cost-management-billing/understand/analyze-unexpected-charges
- Microsoft Learn REST API: Cost Management Scheduled Actions - https://learn.microsoft.com/rest/api/cost-management/scheduled-actions/create-or-update-by-scope

## Issues Found
- The budget examples used `start_date = "2026-01-01T00:00:00Z"`. AzureRM documents that a future budget start date must not be more than twelve months out, and a past start date should be within the current time grain period. As of this validation date, January 1, 2026 is outside the current monthly period for a new monthly budget. Updated all budget examples to start on `2026-06-01T00:00:00Z` and end on `2027-06-01T00:00:00Z`.
- The cost anomaly example used `azurerm_monitor_scheduled_query_rules_alert_v2` with an `AzureDiagnostics` query for cost records. Azure Cost Management anomaly alerts are modeled as Cost Management scheduled actions, and the AzureRM provider exposes them through `azurerm_cost_anomaly_alert`. Replaced the scheduled query rule example with a valid `azurerm_cost_anomaly_alert` example.

## Review Notes
- The budget, resource-group budget, tag filter, notification, and action group examples match current AzureRM provider argument names and allowed values.
- Azure Cost Management anomaly alerts are subscription-scoped and email-based; they do not use Azure Monitor action groups directly.
