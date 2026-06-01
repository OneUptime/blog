# Validation Summary: How to Create Custom Microsoft Sentinel Workbooks Using KQL Queries

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Microsoft Sentinel
- Azure Monitor Workbooks
- Log Analytics
- Kusto Query Language (KQL)
- Azure CLI
- Microsoft Entra sign-in logs

## Sources Consulted
- Microsoft Sentinel workbooks documentation: https://learn.microsoft.com/en-us/azure/sentinel/monitor-your-data
- Microsoft Sentinel workbook creation documentation: https://learn.microsoft.com/en-us/azure/sentinel/sentinel-workbook-creation
- Azure Monitor workbook parameters documentation: https://learn.microsoft.com/en-us/azure/azure-monitor/visualize/workbooks-parameters
- Azure Monitor workbook time parameters documentation: https://learn.microsoft.com/en-ca/azure/azure-monitor/visualize/workbooks-time
- Azure Monitor workbook visualizations documentation: https://learn.microsoft.com/en-us/azure/azure-monitor/visualize/workbooks-commonly-used-components
- Azure Monitor workbook grid visualizations documentation: https://learn.microsoft.com/en-us/azure/azure-monitor/visualize/workbooks-grid-visualizations
- Azure Monitor workbook tile visualizations documentation: https://learn.microsoft.com/en-za/azure/azure-monitor/visualize/workbooks-tile-visualizations
- Azure Monitor cross-workspace query documentation: https://learn.microsoft.com/en-us/azure/azure-monitor/logs/cross-workspace-query
- Azure CLI workbook command reference: https://learn.microsoft.com/en-us/cli/azure/monitor/app-insights/workbook
- Azure Monitor Logs SigninLogs table reference: https://learn.microsoft.com/en-us/azure/azure-monitor/reference/tables/signinlogs
- Azure Monitor Logs SecurityAlert table reference: https://learn.microsoft.com/en-gb/azure/azure-monitor/reference/tables/securityalert
- Kusto prev() function documentation: https://learn.microsoft.com/en-us/kusto/query/prev-function
- Kusto serialize operator documentation: https://learn.microsoft.com/en-us/kusto/query/serialize-operator
- Kusto make-series operator documentation: https://learn.microsoft.com/en-us/kusto/query/make-series-operator
- Kusto mv-expand operator documentation: https://learn.microsoft.com/en-us/kusto/query/mv-expand-operator

## Issues Found
- The Azure CLI command used `az monitor workbook show`, which is not the current documented command group for workbooks. Changed it to `az monitor app-insights workbook show` and added `--can-fetch-content true` so the retrieved JSON includes workbook content.
- The CLI section described the command as exporting an ARM template, but the documented command retrieves workbook resource JSON. Updated the wording to avoid claiming it creates a full ARM deployment template.
- The failed sign-ins tile could divide by zero when the selected time range has no sign-in rows. Added an `iff(TotalSignIns == 0, 0.0, ...)` guard.
- The top risky users query used `prev(ResultType)` inside `summarize`, but Kusto window functions such as `prev()` require a serialized row set. Added ordering, `serialize`, previous-row columns, and a flag that is safely aggregated by user.

## Review Notes
- Microsoft documentation now notes that Microsoft Sentinel in the Azure portal will no longer be supported after March 31, 2027 and Sentinel will be available only in the Microsoft Defender portal. The post remains technically valid as of 2026-06-01, but this is a future caveat to revisit before or after that date.
- Cross-workspace queries using `workspace()` are valid, but Microsoft recommends using workspace GUIDs or full Azure resource IDs rather than plain workspace names for better performance and fewer ambiguity errors.
