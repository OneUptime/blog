# Validation Summary: How to Perform Cross-Workspace Queries in Azure Log Analytics

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Azure Log Analytics
- Azure Monitor Logs
- Kusto Query Language (KQL)
- Cross-workspace and cross-resource queries
- Application Insights
- Azure Monitor log search alerts
- Azure Workbooks

## Sources Consulted
- Microsoft Learn: Query data across Log Analytics workspaces, applications, and resources in Azure Monitor: https://learn.microsoft.com/en-us/azure/azure-monitor/logs/cross-workspace-query
- Microsoft Learn: Cross workspace queries API: https://learn.microsoft.com/en-us/azure/azure-monitor/logs/api/cross-workspace-queries
- Microsoft Learn: Standard columns in Azure Monitor log records: https://learn.microsoft.com/en-us/azure/azure-monitor/logs/log-standard-columns
- Microsoft Learn: Azure Monitor service limits: https://learn.microsoft.com/en-us/azure/azure-monitor/fundamentals/service-limits
- Microsoft Learn: Logs Query API timeouts: https://learn.microsoft.com/en-us/azure/azure-monitor/logs/api/timeouts
- Microsoft Learn: Kusto Query Language join operator: https://learn.microsoft.com/en-us/azure/kusto/query/joinoperator
- Microsoft Learn: Azure Monitor Logs reference for AppExceptions: https://learn.microsoft.com/en-us/azure/azure-monitor/reference/tables/appexceptions
- Microsoft Learn: Create or edit a log search alert rule: https://learn.microsoft.com/en-us/azure/azure-monitor/app/alerts/

## Issues Found
- The workspace identifier section said workspace name was the simplest option and only worked within the same subscription. Microsoft documentation recommends workspace ID or Azure resource ID because name/resource-name references can be ambiguous, less efficient, and can fail in cross-workspace queries. Updated the wording to recommend workspace ID or resource ID while keeping the name example as a valid but discouraged form.
- The Application Insights cross-resource query mixed workspace-based Application Insights columns with classic Application Insights columns. `AppExceptions` uses `OperationName`, while classic `pageViews` uses `operation_Name` and `timestamp`. Updated the example to normalize both sides to `OperationName` and `TimeBucket` before joining.
- The performance section claimed a roughly 500 GB scanned limit. Current Azure Monitor documentation describes limits such as data returned per workspace, query-hour limits, and Logs Query API timeouts rather than a general 500 GB scanned limit. Replaced the claim with the documented limit categories.
- The alert rule limitations section claimed the alert rule must be created in the same region as the primary workspace. The current cross-resource query documentation instead calls out support through the current `scheduledQueryRules` API and not the legacy Log Analytics Alerts API. Updated the caveat accordingly.

## Review Notes
The remaining KQL examples are illustrative and depend on the referenced tables being present in the selected workspaces. Workspace-based Application Insights resources store telemetry in Log Analytics workspaces, while `app()` is primarily relevant for classic Application Insights resources.
