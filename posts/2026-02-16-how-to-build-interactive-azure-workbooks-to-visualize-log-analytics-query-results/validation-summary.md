# Validation Summary: Build Interactive Azure Workbooks to Visualize Log Analytics Query Results

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Monitor Workbooks
- Log Analytics
- Kusto Query Language (KQL)
- Azure Monitor Logs tables: Event, Heartbeat, Perf, SigninLogs
- Azure Monitor Agent

## Sources Consulted
- Microsoft Learn: Azure Workbooks overview - https://learn.microsoft.com/en-us/azure/azure-monitor/visualize/workbooks-overview
- Microsoft Learn: Create or edit an Azure Workbook - https://learn.microsoft.com/en-us/azure/azure-monitor/visualize/workbooks-create-workbook
- Microsoft Learn: Workbook parameters - https://learn.microsoft.com/en-us/azure/azure-monitor/visualize/workbooks-parameters
- Microsoft Learn: Workbook visualizations - https://learn.microsoft.com/en-us/azure/azure-monitor/visualize/workbooks-visualizations
- Microsoft Learn: Grid visualizations - https://learn.microsoft.com/en-us/azure/azure-monitor/visualize/workbooks-grid-visualizations
- Microsoft Learn: Azure Workbooks link actions - https://learn.microsoft.com/en-us/azure/azure-monitor/visualize/workbooks-link-actions
- Microsoft Learn: Azure Workbooks data sources - https://learn.microsoft.com/en-us/azure/azure-monitor/visualize/workbooks-data-sources
- Microsoft Learn: Azure Monitor Agent overview - https://learn.microsoft.com/en-us/azure/azure-monitor/agents/azure-monitor-agent-overview
- Microsoft Learn: Migrate to Azure Monitor Agent from Log Analytics agent - https://learn.microsoft.com/en-us/azure/azure-monitor/agents/azure-monitor-agent-migration
- Microsoft Learn: Azure Monitor Logs reference, Event table - https://learn.microsoft.com/en-us/azure/azure-monitor/reference/tables/event
- Microsoft Learn: Azure Monitor Logs reference, SigninLogs table - https://learn.microsoft.com/en-us/azure/azure-monitor/reference/tables/signinlogs
- Microsoft Learn: Kusto summarize operator - https://learn.microsoft.com/en-us/kusto/query/summarize-operator
- Microsoft Learn: Kusto countif aggregation function - https://learn.microsoft.com/en-us/kusto/query/countif-aggregation-function

## Issues Found
- The "Honey Comb" heading and wording used a nonstandard spelling. Changed it to "Honeycomb" and clarified that the Workbook graph type should be configured as a honeycomb or hive cluster layout, matching Microsoft terminology.
- The CPU example was labeled as a heatmap but used `render timechart`, which produces a time chart rather than a heatmap. Renamed it to "CPU Usage Trend" and updated the comment to match the query behavior.
- The disk space example hardcoded `ago(1h)` even though the post recommends using the shared time range parameter for Workbook consistency. Changed it to `TimeGenerated {TimeRange}`.
- The markdown runbook text told readers to verify the Log Analytics agent. The legacy Log Analytics agent was retired on August 31, 2024, and Microsoft identifies Azure Monitor Agent as the supported agent for guest OS data collection. Updated the text to refer to Azure Monitor Agent or the applicable monitoring agent for the environment.

## Review Notes
The remaining KQL examples use valid Workbook time range parameter expansion and standard KQL operators such as `summarize`, `countif`, `dcount`, `bin`, `top`, `sort`, and `render timechart`. The examples assume that the target Log Analytics workspace contains the relevant tables and columns, such as `Event`, `Heartbeat`, `Perf`, and `SigninLogs`; in a production template, missing-table guards or conditional visibility can improve portability across workspaces.
