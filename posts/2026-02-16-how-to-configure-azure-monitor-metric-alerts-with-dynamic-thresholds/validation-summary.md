# Validation Summary: How to Configure Azure Monitor Metric Alerts with Dynamic Thresholds

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Monitor
- Azure Monitor metric alert rules
- Dynamic thresholds
- Azure CLI
- Azure Resource Manager templates
- Azure action groups

## Sources Consulted
- Azure Monitor dynamic thresholds documentation: https://learn.microsoft.com/en-us/azure/azure-monitor/alerts/alerts-dynamic-thresholds
- Create Azure Monitor metric alert rules: https://learn.microsoft.com/en-us/azure/azure-monitor/alerts/alerts-create-metric-alert-rule
- Azure CLI `az monitor metrics alert` reference: https://learn.microsoft.com/en-us/cli/azure/monitor/metrics/alert
- Azure CLI `az monitor metrics alert condition create` reference: https://learn.microsoft.com/en-us/cli/azure/monitor/metrics/alert/condition
- ARM template reference for `Microsoft.Insights/metricAlerts`: https://learn.microsoft.com/en-us/azure/templates/microsoft.insights/metricalerts
- Azure Monitor alerts overview: https://learn.microsoft.com/en-us/azure/azure-monitor/alerts/alerts-overview
- Azure Monitor pricing: https://azure.microsoft.com/en-us/pricing/details/monitor/

## Issues Found
- Corrected the explanation of historical data requirements. Azure Monitor uses 10 days of history for initial threshold calculation, does not trigger dynamic threshold alerts until at least 3 days and 30 samples are available, and needs about three weeks to identify weekly seasonality.
- Changed the prerequisite wording so it no longer implies that the alert cannot be configured before three days of history exists.
- Corrected the portal advanced options explanation. The model learning date is controlled by "Ignore data before"; evaluation settings control the violation/evaluation period behavior.
- Updated the Azure CLI example to use an ISO 8601 timestamp for the `since` value.
- Removed the claim that dynamic thresholds are appropriate for gradual degradation. Microsoft documentation says slow behavior changes probably will not trigger a dynamic threshold alert.
- Added the same-region limitation for multi-resource metric alerts.
- Reworded the cost section to match Azure Monitor pricing mechanics: metric alerts are billed by monitored time series, and dynamic thresholds add a separate dynamic-threshold charge.

## Review Notes
The Azure CLI was not installed in the local environment, so CLI validation was performed against the official Microsoft Learn command reference instead of local `az --help` output. The ARM template structure and dynamic threshold fields match the current `Microsoft.Insights/metricAlerts` documentation.
