# Validation Summary: How to Set Up Autoscale Rules in Azure Monitor for Azure App Services

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Monitor autoscale
- Azure App Service and App Service plans
- Azure CLI
- Bicep / ARM templates
- Azure Monitor Activity Log

## Sources Consulted
- Microsoft Learn: Azure Monitor autoscale best practices - https://learn.microsoft.com/en-us/azure/azure-monitor/autoscale/autoscale-best-practices
- Microsoft Learn: Autoscale a web app by using custom metrics - https://learn.microsoft.com/en-us/azure/azure-monitor/autoscale/autoscale-custom-metric
- Microsoft Learn: Azure App Service plans - https://learn.microsoft.com/en-us/azure/app-service/overview-hosting-plans
- Microsoft Learn: Supported metrics for Microsoft.Web/serverfarms - https://learn.microsoft.com/en-us/azure/azure-monitor/reference/supported-metrics/microsoft-web-serverfarms-metrics
- Microsoft Learn: Azure CLI az monitor autoscale - https://learn.microsoft.com/en-us/cli/azure/monitor/autoscale
- Microsoft Learn: Azure CLI az monitor autoscale rule - https://learn.microsoft.com/en-us/cli/azure/monitor/autoscale/rule
- Microsoft Learn: Azure CLI az monitor activity-log - https://learn.microsoft.com/en-us/cli/azure/monitor/activity-log
- Microsoft Learn: Microsoft.Insights/autoscalesettings 2022-10-01 template reference - https://learn.microsoft.com/en-us/azure/templates/microsoft.insights/2022-10-01/autoscalesettings
- Microsoft Learn: Autoscale diagnostics - https://learn.microsoft.com/en-us/azure/azure-monitor/autoscale/autoscale-diagnostics

## Issues Found
- The prerequisites listed only Standard and Premium App Service plan tiers. Updated this to Standard, Premium, or Isolated to match the later pitfall note and App Service autoscale support guidance.
- The portal instructions said "three options" but listed only two options. Reworded this to "scale options such as" to avoid an inaccurate fixed count while preserving the author's guidance to choose Custom autoscale.
- The Activity Log CLI example used `--caller "Microsoft.Insights/autoscaleSettings"`. Official Azure CLI documentation defines `--caller` as a caller identity filter, so this would not reliably filter autoscale events. Changed the example to filter the Microsoft.Insights namespace and use a JMESPath filter for Activity Log entries whose category is Autoscale.

## Review Notes
- The Azure CLI autoscale commands use current command groups and valid option names according to Microsoft Learn. The local environment did not have `az` installed, so CLI verification was performed against official Azure CLI documentation rather than local `--help` output.
- The Bicep snippet matches the documented `Microsoft.Insights/autoscalesettings@2022-10-01` schema for capacity, metric triggers, and scale actions.
- The metric names `CpuPercentage` and `HttpQueueLength` are valid REST/API metric names for `Microsoft.Web/serverfarms`; their portal display names are "CPU Percentage" and "Http Queue Length".
