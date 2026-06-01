# Validation Summary: How to Create Real-Time Dashboards in Azure Data Explorer

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Data Explorer dashboards
- Kusto Query Language (KQL)
- Dashboard parameters and filters
- Dashboard visualizations
- Dashboard sharing and permissions
- Dashboard JSON export/import
- Kusto materialized views
- Query results caching

## Sources Consulted
- Microsoft Learn: Visualize data with Azure Data Explorer dashboards - https://learn.microsoft.com/en-us/azure/data-explorer/azure-data-explorer-dashboards
- Microsoft Learn: Use parameters in Azure Data Explorer dashboards - https://learn.microsoft.com/en-us/azure/data-explorer/dashboard-parameters
- Microsoft Learn: Customize Azure Data Explorer dashboard visuals - https://learn.microsoft.com/en-us/azure/data-explorer/dashboard-customize-visuals
- Microsoft Learn: Dashboard-specific visuals - https://learn.microsoft.com/en-us/azure/data-explorer/dashboard-visuals
- Microsoft Learn: Share Azure Data Explorer dashboards - https://learn.microsoft.com/en-us/azure/data-explorer/azure-data-explorer-dashboard-share
- Microsoft Learn: Tutorial: Use aggregation functions in Kusto Query Language - https://learn.microsoft.com/en-us/kusto/query/tutorials/use-aggregation-functions
- Microsoft Learn: .create materialized-view - https://learn.microsoft.com/en-us/kusto/management/materialized-views/materialized-view-create

## Issues Found
- The post described creating a separate time range parameter with fixed available values. Microsoft documentation states every Azure Data Explorer dashboard has a default time range parameter, which becomes active when `_startTime` and `_endTime` are used in a query. Updated the text to describe the default parameter and changed the sample query to use `between (_startTime.._endTime)`, matching the official example.
- The service filter parameter omitted the dashboard variable name and mixed single-selection and multi-selection instructions. Updated it to a multiple-selection parameter with the explicit variable name `_ServiceFilter`, matching the query syntax used later.
- The auto-refresh instructions referenced a refresh icon and direct interval selection. Current documentation places auto-refresh configuration under **Settings > Auto refresh**, with a minimum interval and default refresh rate. Updated the workflow.
- The page creation instructions referenced a "+" icon next to page tabs. Current documentation uses the Pages pane and "+ Add page". Updated the instruction.
- The sharing section implied publishing for organization-wide access. Current documentation requires granting dashboard permissions, sharing the dashboard link, and ensuring viewers have access to the underlying database. Updated the sharing note.
- The post showed undocumented curl calls to `https://dataexplorer.azure.com/api/dashboards/...` for export/import. Official documentation describes dashboard JSON export/import through the web UI. Removed the curl examples and replaced them with the documented File menu workflows.
- The cache-results note implied automatic dashboard caching. Current documentation says query results caching is enabled by configuring **Query results cache max age** on the dashboard data source. Updated the performance tip.
- The conditional formatting section implied KQL itself adds color-coding. Updated the wording to distinguish KQL status labels from dashboard table conditional formatting.

## Review Notes
The KQL examples use current operators and functions, including `ago()`, `summarize`, `countif()`, `dcount()`, `percentile()`, `bin()`, `case()`, `isempty()`, `render timechart`, `take`, and materialized view creation syntax. The materialized view example is syntactically consistent with current Kusto documentation, though creating materialized views requires sufficient database permissions and should be evaluated against workload-specific materialized view limitations.
