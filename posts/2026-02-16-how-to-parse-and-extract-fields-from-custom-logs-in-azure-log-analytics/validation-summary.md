# Validation Summary: How to Parse and Extract Fields from Custom Logs in Azure Log Analytics

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Log Analytics
- Azure Monitor Logs
- Kusto Query Language (KQL)
- Azure Monitor Agent
- Logs Ingestion API
- Data Collection Rules and transformations

## Sources Consulted
- Microsoft Learn: parse operator - https://learn.microsoft.com/en-us/kusto/query/parse-operator?view=microsoft-fabric
- Microsoft Learn: parse-where operator - https://learn.microsoft.com/en-us/kusto/query/parse-where-operator?view=microsoft-fabric
- Microsoft Learn: extract() - https://learn.microsoft.com/en-us/kusto/query/extract-function?view=microsoft-fabric
- Microsoft Learn: extract_all() - https://learn.microsoft.com/en-us/kusto/query/extract-all-function?view=microsoft-fabric
- Microsoft Learn: split() - https://learn.microsoft.com/en-us/kusto/query/split-function?view=microsoft-fabric
- Microsoft Learn: parse_json() - https://learn.microsoft.com/en-us/kusto/query/parse-json-function?view=microsoft-fabric
- Microsoft Learn: String operators - https://learn.microsoft.com/en-us/azure/kusto/query/datatypes-string-operators
- Microsoft Learn: isnotnull() - https://learn.microsoft.com/en-us/kusto/query/isnotnull-function?view=microsoft-fabric
- Microsoft Learn: Functions in Azure Monitor log queries - https://learn.microsoft.com/en-us/azure/azure-monitor/logs/functions
- Microsoft Learn: Logs Ingestion API in Azure Monitor - https://learn.microsoft.com/en-us/azure/azure-monitor/logs/custom-logs-overview
- Microsoft Learn: Collect text file from virtual machine with Azure Monitor - https://learn.microsoft.com/en-ca/azure/azure-monitor/agents/data-collection-text-log
- Microsoft Learn: Create a transformation in Azure Monitor - https://learn.microsoft.com/en-us/azure/azure-monitor/data-collection/data-collection-transformations-create
- Microsoft Learn: Supported KQL features in Azure Monitor transformations - https://learn.microsoft.com/en-us/azure/azure-monitor/data-collection/data-collection-transformations-kql
- Microsoft Learn: Migrate from the HTTP Data Collector API to the Log Ingestion API - https://learn.microsoft.com/en-us/azure/azure-monitor/logs/custom-logs-migrate

## Issues Found
- Updated the ingestion overview to refer to the current Logs Ingestion API and describe the HTTP Data Collector API as legacy.
- Changed `isnotempty(OrderId)` to `isnotnull(OrderId)` because `OrderId` is parsed as a `long`, and numeric null checks should use `isnotnull()`.
- Changed the reusable function examples to call `ParseAppLogs()` with parentheses.
- Updated the workspace function save steps to match the documented Azure Monitor Logs flow: open Logs, test the query, then use Save > Save as function.
- Clarified that the DCR transformation example assumes the destination table has matching output columns, and cast `OrderId` to `long` so the transformation output can match a typed table schema.
- Replaced `contains "ERROR"` with `has "ERROR"` in the performance example to align with the following guidance about using term-indexed searches when filtering for full terms.
- Reworded the regex performance note to avoid implying KQL regex behavior that is not described in the official regex documentation.

## Review Notes
The post is technically relevant and the remaining KQL examples align with current Microsoft documentation for Azure Monitor Logs and Kusto Query Language. The examples still use placeholder table and column names, so readers must adapt them to their own custom table schemas.
