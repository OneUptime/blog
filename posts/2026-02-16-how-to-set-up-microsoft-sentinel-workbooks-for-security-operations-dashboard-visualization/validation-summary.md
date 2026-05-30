# Validation Summary: How to Set Up Microsoft Sentinel Workbooks

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Microsoft Sentinel
- Azure Monitor Workbooks
- Kusto Query Language (KQL)
- Azure CLI
- Microsoft Sentinel SecurityIncident and ThreatIntelIndicators tables

## Sources Consulted
- Microsoft Sentinel workbooks documentation: https://learn.microsoft.com/en-us/azure/sentinel/monitor-your-data
- Azure Monitor workbook time parameters: https://learn.microsoft.com/en-us/azure/azure-monitor/visualize/workbooks-time
- Azure Monitor workbook management and auto-refresh: https://learn.microsoft.com/en-us/azure/azure-monitor/visualize/workbooks-manage
- Azure Workbooks overview and access control: https://learn.microsoft.com/en-us/azure/azure-monitor/visualize/workbooks-overview
- Microsoft Sentinel incident metrics and SecurityIncident usage: https://learn.microsoft.com/en-us/azure/sentinel/manage-soc-with-incident-metrics
- Azure Monitor Logs SecurityIncident table reference: https://learn.microsoft.com/en-us/azure/azure-monitor/reference/tables/securityincident
- Microsoft Sentinel threat intelligence documentation: https://learn.microsoft.com/en-us/azure/sentinel/understand-threat-intelligence
- Azure Monitor Logs ThreatIntelIndicators table reference: https://learn.microsoft.com/en-us/azure/azure-monitor/reference/tables/threatintelindicators
- Azure CLI workbook command reference: https://learn.microsoft.com/en-us/cli/azure/monitor/app-insights/workbook

## Issues Found
- The SecurityIncident queries counted every incident update row, which can overcount incidents because Microsoft Sentinel writes a new SecurityIncident record when an incident is created or updated. Updated the incident queries to use `summarize arg_max(TimeGenerated, *) by IncidentNumber` before producing dashboard counts and tables.
- The incident owner examples referenced a non-existent `AssignedTo` column. Updated them to read the current dynamic owner object with `tostring(Owner.assignedTo)`.
- The incident summary query used `AdditionalData.alertsCount`. Updated it to use `array_length(AlertIds)`, which matches the documented SecurityIncident schema and avoids relying on an undocumented dynamic property name.
- The threat intelligence query used the legacy `ThreatIntelligenceIndicator` table and `Active` field. Updated it to use the current `ThreatIntelIndicators` table and fields including `IsActive`, `IsDeleted`, `Revoked`, `Id`, and `ObservableKey`.
- The Azure CLI workbook export/import example used a display name as `--name`, but the CLI requires the workbook resource name to be a UUID. Updated the example to use UUID resource names and `--display-name` for the friendly workbook name.
- The Azure CLI export example did not request full workbook content or output the serialized data cleanly. Added `--can-fetch-content true`, `--query serializedData`, and `--output tsv`.
- The Azure CLI create example omitted `--category workbook`, which is part of the official create example and helps classify the workbook resource correctly.

## Review Notes
- Microsoft states that Microsoft Sentinel in the Azure portal will no longer be supported after March 31, 2027 and will be available only in the Microsoft Defender portal. The post's Azure portal workflow remains valid as of 2026-05-30, but should be revisited before that date.
- The local environment did not have the Azure CLI installed, so CLI validation was performed against the official Azure CLI reference rather than local `az --help` output.
