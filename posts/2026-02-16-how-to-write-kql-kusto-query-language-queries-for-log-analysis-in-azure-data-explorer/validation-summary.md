# Validation Summary: How to Write KQL Queries for Log Analysis in Azure Data Explorer

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kusto Query Language (KQL)
- Azure Data Explorer
- Azure Monitor
- Microsoft Sentinel
- KQL log filtering, projection, sorting, aggregation, joins, dynamic JSON columns, saved functions, time-series analysis, and render visualizations

## Sources Consulted
- Microsoft Learn: Kusto Query Language overview - https://learn.microsoft.com/en-us/azure/data-explorer/kusto/query/
- Microsoft Learn: Query operators - https://learn.microsoft.com/en-us/kusto/query/queries?view=azure-data-explorer
- Microsoft Learn: String operators - https://learn.microsoft.com/en-us/kusto/query/datatypes-string-operators?view=microsoft-fabric
- Microsoft Learn: has operator - https://learn.microsoft.com/en-us/kusto/query/has-operator?view=microsoft-fabric
- Microsoft Learn: has_all operator - https://learn.microsoft.com/en-us/kusto/query/has-all-operator?view=microsoft-fabric
- Microsoft Learn: contains operator - https://learn.microsoft.com/en-us/kusto/query/contains-operator?view=microsoft-fabric
- Microsoft Learn: matches regex operator - https://learn.microsoft.com/en-us/kusto/query/matches-regex-operator?view=microsoft-fabric
- Microsoft Learn: String data type and verbatim string literals - https://learn.microsoft.com/en-us/kusto/query/scalar-data-types/string?view=azure-data-explorer
- Microsoft Learn: Datetime data type - https://learn.microsoft.com/en-us/kusto/query/scalar-data-types/datetime?view=microsoft-fabric
- Microsoft Learn: summarize operator - https://learn.microsoft.com/en-us/kusto/query/summarize-operator?view=microsoft-fabric
- Microsoft Learn: join operator - https://learn.microsoft.com/en-us/kusto/query/join-operator?view=azure-monitor
- Microsoft Learn: mv-expand operator - https://learn.microsoft.com/en-us/kusto/query/mv-expand-operator?view=microsoft-fabric
- Microsoft Learn: dynamic data type - https://learn.microsoft.com/en-us/kusto/query/scalar-data-types/dynamic?view=microsoft-fabric
- Microsoft Learn: replace_regex() - https://learn.microsoft.com/en-us/kusto/query/replace-regex-function?view=microsoft-fabric
- Microsoft Learn: series_decompose_anomalies() - https://learn.microsoft.com/en-us/kusto/query/series-decompose-anomalies-function?view=microsoft-fabric
- Microsoft Learn: .create-or-alter function command - https://learn.microsoft.com/en-us/kusto/management/create-alter-function?view=azure-data-explorer
- Microsoft Learn: render operator - https://learn.microsoft.com/en-ca/kusto/query/render-operator?view=microsoft-fabric

## Issues Found
- Replaced "Azure Sentinel" with "Microsoft Sentinel" because Microsoft documentation now refers to the service as Microsoft Sentinel.
- Changed the chained-filter comment from "AND is implicit" to "Multiple chained filters apply AND logic" to avoid implying that KQL permits omitted logical operators inside a single `where` expression.
- Changed `Message has "connection refused"` to `Message has_all ("connection", "refused")` because `has` is a whole-term operator for a single search term, while `has_all` is the documented operator for requiring multiple terms.
- Changed the anomaly-detection comment from "error rate" to "error counts" because the query builds a count series, not a calculated rate.
- Changed the log-pattern comment from `extract` to `replace_regex` because the example uses `replace_regex()` for normalization.
- Changed the visualization example from `render scatterchart` over a datetime x-axis to `render timechart`, because Microsoft render documentation describes `scatterchart` axes as numeric and `timechart` as the visualization for datetime x-axis data.

## Review Notes
The examples use illustrative `AppLogs` and `RequestLogs` schemas, so they depend on matching column names and types in the reader's environment. The saved-function examples are valid Kusto management command syntax, but users typically execute management commands and function calls as separate submissions in the Azure Data Explorer UI.
