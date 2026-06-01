# Validation Summary: How to Configure Azure Monitor Alerts and Action Groups with Terraform

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform
- HashiCorp AzureRM provider
- Azure Monitor alerts
- Azure Monitor action groups
- Azure Monitor metric alerts
- Azure Monitor log search alerts
- Log Analytics and KQL

## Sources Consulted
- HashiCorp AzureRM provider documentation for `azurerm_monitor_action_group`: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/monitor_action_group
- HashiCorp AzureRM provider documentation for `azurerm_monitor_metric_alert`: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/monitor_metric_alert
- HashiCorp AzureRM provider documentation for `azurerm_monitor_scheduled_query_rules_alert_v2`: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/monitor_scheduled_query_rules_alert_v2
- Azure Monitor supported metrics for Microsoft.Web/sites: https://learn.microsoft.com/en-us/azure/azure-monitor/reference/supported-metrics/microsoft-web-sites-metrics
- Azure Virtual Machines monitoring data reference: https://learn.microsoft.com/en-us/azure/virtual-machines/monitor-vm-reference
- Azure SQL Database monitoring metrics and alerts: https://learn.microsoft.com/en-us/azure/azure-sql/database/monitoring-metrics-alerts
- Azure Monitor alert types and dynamic thresholds: https://learn.microsoft.com/en-us/azure/azure-monitor/alerts/alerts-types
- Azure Monitor action groups and webhook behavior: https://learn.microsoft.com/en-us/azure/azure-monitor/alerts/action-groups
- Azure Monitor common alert schema: https://learn.microsoft.com/en-us/azure/azure-monitor/alerts/alerts-common-schema
- Slack incoming webhooks documentation: https://api.slack.com/messaging/webhooks

## Issues Found
- The informational action group used a receiver named `slack-webhook` with `var.slack_webhook_url`, which implied Azure Monitor could post directly to a Slack incoming webhook. Azure Monitor webhook actions send Azure alert payloads, and Microsoft recommends transforming payloads when the target expects a specific schema. Slack incoming webhooks expect Slack message payloads. Changed the example to use a generic internal webhook receiver named `info-webhook` with `var.info_webhook_url`.

## Review Notes
- Terraform was not installed in the local environment, so validation was performed against official AzureRM provider and Azure documentation rather than by running `terraform validate`.
- The Terraform resource names, block names, argument names, severity values, ISO 8601 frequencies/windows, metric namespaces, and metric names used in the post match the official provider and Azure Monitor documentation reviewed.
