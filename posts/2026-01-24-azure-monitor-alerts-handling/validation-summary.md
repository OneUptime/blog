# Validation Summary: How to Handle Azure Monitor Alerts

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Azure Monitor alerts
- Azure CLI
- Azure Monitor action groups
- Azure Monitor alert processing rules
- Azure Resource Graph
- Azure Resource Manager templates
- Terraform AzureRM provider
- Azure Functions for Python
- PagerDuty Events API

## Sources Consulted
- Microsoft Learn: Azure Monitor alerts overview - https://learn.microsoft.com/en-us/azure/azure-monitor/alerts/alerts-overview
- Microsoft Learn: Azure Monitor common alert schema - https://learn.microsoft.com/en-us/azure/azure-monitor/alerts/alerts-common-schema
- Microsoft Learn: Azure CLI `az monitor metrics alert` - https://learn.microsoft.com/en-us/cli/azure/monitor/metrics/alert
- Microsoft Learn: Azure CLI `az monitor scheduled-query` - https://learn.microsoft.com/en-us/cli/azure/monitor/scheduled-query
- Microsoft Learn: Azure CLI `az monitor activity-log alert` - https://learn.microsoft.com/en-us/cli/azure/monitor/activity-log/alert
- Microsoft Learn: Azure CLI `az monitor action-group` - https://learn.microsoft.com/en-us/cli/azure/monitor/action-group
- Microsoft Learn: Azure CLI `az monitor alert-processing-rule` - https://learn.microsoft.com/en-us/cli/azure/monitor/alert-processing-rule
- Microsoft Learn: Azure Resource Graph sample queries for Azure Monitor alerts - https://learn.microsoft.com/en-us/azure/governance/resource-graph/samples/samples-by-category
- Microsoft Learn: Supported metrics for `Microsoft.Compute/virtualMachines` - https://learn.microsoft.com/en-us/azure/azure-monitor/reference/supported-metrics/microsoft-compute-virtualmachines-metrics
- Microsoft Learn: ARM template reference for `Microsoft.Insights/scheduledQueryRules` - https://learn.microsoft.com/en-us/azure/templates/microsoft.insights/scheduledqueryrules
- Microsoft Learn: ARM template reference for `Microsoft.Insights/actionGroups` - https://learn.microsoft.com/en-us/azure/templates/microsoft.insights/actiongroups
- Terraform Registry: `azurerm_monitor_action_group` - https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/monitor_action_group
- Terraform Registry: `azurerm_monitor_metric_alert` - https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/monitor_metric_alert
- Terraform Registry: `azurerm_monitor_alert_processing_rule_suppression` - https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/monitor_alert_processing_rule_suppression
- PagerDuty: Microsoft Azure Alerts Integration Guide - https://www.pagerduty.com/docs/guides/azure-integration-guide/
- PagerDuty Developer Docs: Events API v2 overview - https://developer.pagerduty.com/docs/events-api-v2/overview/

## Issues Found
- The metric alert CLI examples used `--action-group`, but current Azure CLI documentation uses `--action` for metric alert action groups. Updated both metric alert examples.
- The log search alert CLI example used a query string directly as the condition placeholder and a separate unrelated `--condition-query`. Updated it to use a named placeholder in `--condition` and bind that placeholder in `--condition-query`.
- The activity log alert condition was unquoted, which would be split incorrectly by the shell. Quoted the full condition expression.
- The action group CLI example used stale singular receiver flags. Updated it to the documented `--action` syntax for email, SMS, and webhook receivers.
- The Terraform action group webhook receiver used `uri`, but the AzureRM provider uses `service_uri`. Updated the field and enabled common alert schema where the later webhook processing examples expect it.
- The Terraform Azure Function receiver referenced deprecated `azurerm_function_app`. Updated the example reference to `azurerm_linux_function_app` and enabled common alert schema.
- The PagerDuty JSON example implied Azure Monitor action groups can template and send a PagerDuty Events API v2 payload directly. Clarified that this mapping should be done through middleware such as Logic Apps or Azure Functions, and changed the payload fields to valid Events API-style values.
- The Azure Function sample routed disk space alerts to an undefined `handle_disk_space` function. Added a minimal handler so the sample is runnable.
- The alert processing rule CLI example used unsupported schedule flag names and an IANA time zone. Updated it to the documented `--schedule-start-datetime`, `--schedule-end-datetime`, recurrence time flags, and a Windows time zone value.
- The Terraform alert processing rule used an IANA time zone value where the provider expects Azure/Windows time zone names. Updated it to `Eastern Standard Time`.
- The Terraform disk metric alert used `OS Disk Used Percentage`, which is not a supported `Microsoft.Compute/virtualMachines` metric. Updated it to `OS Disk IOPS Consumed Percentage` and adjusted the example label/name.
- The alert history CLI example used a non-existent `az monitor activity-log alert list-fired` command and queried `AlertsManagementResources` through Log Analytics. Replaced both with Azure Resource Graph `az graph query` examples using the documented `alertsmanagementresources` table.

## Review Notes
Azure CLI was not installed in the local workspace, so CLI validation was performed against official Microsoft Learn command references instead of local `az --help` output. The article is technically relevant and includes implementation examples, so it was reviewed as a technical guide.
