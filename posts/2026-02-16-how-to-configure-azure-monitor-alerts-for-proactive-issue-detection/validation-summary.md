# Validation Summary: How to Configure Azure Monitor Alerts for Proactive Issue Detection

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Monitor alerts
- Azure Monitor action groups
- Azure Monitor metric alerts
- Azure Monitor scheduled query log alerts
- Azure Activity Log alerts
- Azure Service Health alerts
- Azure Monitor alert processing rules
- Kusto Query Language (KQL)
- Azure CLI

## Sources Consulted
- Azure CLI reference: az monitor action-group: https://learn.microsoft.com/en-us/cli/azure/monitor/action-group?view=azure-cli-latest
- Azure CLI reference: az monitor action-group test-notifications: https://learn.microsoft.com/en-us/cli/azure/monitor/action-group/test-notifications?view=azure-cli-latest
- Azure CLI reference: az monitor metrics alert: https://learn.microsoft.com/en-us/cli/azure/monitor/metrics/alert?view=azure-cli-latest
- Azure CLI reference: az monitor scheduled-query: https://learn.microsoft.com/en-us/cli/azure/monitor/scheduled-query?view=azure-cli-latest
- Azure CLI reference: az monitor activity-log alert: https://learn.microsoft.com/en-us/cli/azure/monitor/activity-log/alert?view=azure-cli-latest
- Azure CLI reference: az monitor alert-processing-rule: https://learn.microsoft.com/en-us/cli/azure/monitor/alert-processing-rule?view=azure-cli-latest
- Azure Monitor supported metrics for Microsoft.Compute/virtualMachines: https://learn.microsoft.com/en-us/azure/azure-monitor/reference/supported-metrics/microsoft-compute-virtualmachines-metrics
- Azure Monitor supported metrics for Microsoft.Web/sites: https://learn.microsoft.com/en-us/azure/azure-monitor/reference/supported-metrics/microsoft-web-sites-metrics
- Azure Monitor supported metrics for Microsoft.Sql/servers/databases: https://learn.microsoft.com/en-us/azure/azure-monitor/reference/supported-metrics/microsoft-sql-servers-databases-metrics
- Azure Monitor supported metrics for Microsoft.Storage/storageAccounts: https://learn.microsoft.com/en-us/azure/azure-monitor/reference/supported-metrics/microsoft-storage-storageaccounts-metrics
- Kusto summarize operator documentation: https://learn.microsoft.com/en-us/kusto/query/summarize-operator?view=microsoft-fabric

## Issues Found
- The scheduled query alert used an invalid `az monitor scheduled-query create` shape: `--condition-query` was provided as a raw query, `--condition` did not reference a query placeholder, and `--action` is not the current option for scheduled query action groups. Changed it to define `ExceptionsQuery=...`, use `count 'ExceptionsQuery' > 50`, and pass the action group with `--action-groups`.
- The custom application health KQL filtered to only the last hour before calculating `LastRun`, which could prevent the query from alerting when no recent job completion event existed. Changed it to calculate the latest completion over the available data and alert when `LastRun` is null or older than 30 minutes.
- The action group test command used unsupported `--notifications` JSON and an invalid `metric` alert type value. Changed it to use `--add-action email ...` and the supported `metricstaticthreshold` alert type.
- The alert processing rule example used `--schedule-recurrence-type Once`, but the Azure CLI accepts recurrence types `Daily`, `Weekly`, and `Monthly`; one-time windows use start and end datetimes without a recurrence type. Removed the invalid recurrence type and adjusted the datetime format to match CLI documentation.

## Review Notes
- The Azure CLI was not installed in the local environment, so commands were validated against current Microsoft Learn CLI reference pages rather than local `az --help` output.
- The metric names used in the examples match Azure Monitor supported metric references for the cited resource types. The SQL DTU metric applies to DTU-based Azure SQL Database configurations.
- The `az monitor alert-processing-rule` command group is documented as a preview extension, so its syntax should be checked again if the post is refreshed in the future.
