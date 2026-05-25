# Validation Summary: How to Create Azure Monitor Metric Alerts in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- HashiCorp AzureRM Provider
- Azure Monitor metric alerts
- Azure Monitor action groups
- Azure Virtual Machines metrics
- Azure App Service metrics
- Azure Storage metrics
- Azure SQL Database metrics

## Sources Consulted
- HashiCorp Terraform Registry: azurerm_monitor_metric_alert resource - https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/monitor_metric_alert
- HashiCorp Terraform Registry: AzureRM provider v4 provider arguments - https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs
- HashiCorp Help Center: Required subscription_id error in Terraform with AzureRM - https://support.hashicorp.com/hc/en-us/articles/40621007246099-Required-subscription-id-Error-in-Terraform-with-AzureRM
- Microsoft Learn: Types of Azure Monitor alerts - https://learn.microsoft.com/en-us/azure/azure-monitor/alerts/alert-options
- Microsoft Learn: Monitor multiple time series in a single metric alert rule - https://learn.microsoft.com/en-us/azure/azure-monitor/alerts/alerts-metric-multiple-time-series-single-rule
- Microsoft Learn: Supported metrics for Microsoft.Compute/virtualMachines - https://learn.microsoft.com/en-us/azure/azure-monitor/reference/supported-metrics/microsoft-compute-virtualmachines-metrics
- Microsoft Learn: Supported metrics for Microsoft.Web/sites - https://learn.microsoft.com/en-us/azure/azure-monitor/reference/supported-metrics/microsoft-web-sites-metrics
- Microsoft Learn: Supported metrics for Microsoft.Storage/storageAccounts - https://learn.microsoft.com/en-us/azure/azure-monitor/reference/supported-metrics/microsoft-storage-storageaccounts-metrics
- Microsoft Learn: Monitor Azure SQL Database with metrics and alerts - https://learn.microsoft.com/en-us/azure/azure-sql/database/monitoring-metrics-alerts
- OneUptime linked guide: Azure Monitor log alerts in Terraform - https://oneuptime.com/blog/post/2026-02-23-how-to-create-azure-monitor-log-alerts-in-terraform/view

## Issues Found
- The foundation snippet used `azurerm` provider version `~> 3.0`. Updated it to `~> 4.0` so the tutorial targets the current major AzureRM provider line.
- AzureRM provider v4 requires `subscription_id` for plan/apply operations. Added `subscription_id = var.subscription_id` to the provider block and added a matching `subscription_id` variable.

## Review Notes
The metric alert resource schema, static and dynamic criteria blocks, severity values, frequency/window values, action group reference, and metric names used in the examples were checked against the current Terraform AzureRM provider documentation and Microsoft Learn metric references. The multi-criteria explanation is correct: Azure Monitor uses AND semantics and fires when all conditions are met. Multi-resource metric alerting is supported for resources of the same type in the same Azure region; the post mentions multi-resource monitoring generally but does not show a multi-scope example.
