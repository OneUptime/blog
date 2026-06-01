# Validation Summary: How to Monitor and Troubleshoot Pipeline Failures in Azure Data Factory

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Azure Data Factory
- Azure Data Factory Studio monitoring
- Azure Monitor metrics and alerts
- Azure Monitor diagnostic settings
- Log Analytics and KQL
- Azure Data Factory Copy activity
- Azure Data Factory Stored Procedure activity
- Azure Data Factory activity retry policies

## Sources Consulted
- Microsoft Learn: Monitor Azure Data Factory - https://learn.microsoft.com/en-us/azure/data-factory/monitor-data-factory
- Microsoft Learn: Azure Data Factory monitoring data reference - https://learn.microsoft.com/en-us/azure/data-factory/monitor-data-factory-reference
- Microsoft Learn: Configure diagnostic settings and a workspace - https://learn.microsoft.com/en-us/azure/data-factory/monitor-configure-diagnostics
- Microsoft Learn: ADFPipelineRun table reference - https://learn.microsoft.com/en-us/azure/azure-monitor/reference/tables/adfpipelinerun
- Microsoft Learn: ADFActivityRun table reference - https://learn.microsoft.com/en-us/azure/azure-monitor/reference/tables/adfactivityrun
- Microsoft Learn: Copy activity overview - https://learn.microsoft.com/en-us/azure/data-factory/copy-activity-overview
- Microsoft Learn: Fault tolerance of copy activity - https://learn.microsoft.com/en-us/azure/data-factory/copy-activity-fault-tolerance
- Microsoft Learn: Transform data by using the SQL Server Stored Procedure activity - https://learn.microsoft.com/en-us/azure/data-factory/transform-data-using-stored-procedure
- Microsoft Learn: Pipelines and activities in Azure Data Factory - https://learn.microsoft.com/en-us/azure/data-factory/concepts-pipelines-activities

## Issues Found
- The targeted alert example used comments inside a `json` code block and labeled the signal as the REST metric name. I removed the comments and changed the display signal to "Failed pipeline runs metrics" while retaining the correct `PipelineFailedRuns` metric name and dimensions.
- The diagnostic settings list included `DataFlowDebugOutput`, which is not listed as a supported Azure Data Factory resource log category in the current Microsoft monitoring data reference. I replaced it with `SSISIntegrationRuntimeLogs` and qualified it as relevant only when Azure-SSIS IR is used.
- The first KQL query projected `ErrorMessage = Parameters`, which overwrote the error message with pipeline parameters. I changed it to project the actual `ErrorMessage` column from `ADFPipelineRun`.
- Several JSON examples contained JavaScript-style comments while using `json` fences. I removed those comments so the examples parse as JSON.
- The Stored Procedure activity example omitted the required `linkedServiceName` property. I added a linked service reference consistent with the Azure Data Factory Stored Procedure activity schema.

## Review Notes
The Copy activity fault-tolerance snippet uses the legacy `enableSkipIncompatibleRow` pattern for tabular data, but Microsoft documentation still describes it. For new implementations, authors may want to mention the newer session log settings for file and binary copy scenarios in a future update.
