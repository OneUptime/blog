# Validation Summary: How to Set Up Azure Log Analytics Data Collection Rules for Custom Log Sources

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Monitor Agent
- Azure Data Collection Rules
- Azure Data Collection Endpoints
- Azure Log Analytics custom tables
- Azure CLI
- KQL ingestion-time transformations
- Windows Event Logs
- Linux Syslog
- Performance counters
- Azure Policy

## Sources Consulted
- Microsoft Learn: Collect text file from virtual machine with Azure Monitor: https://learn.microsoft.com/en-us/azure/azure-monitor/vm/data-collection-log-text
- Microsoft Learn: Sample data collection rules in Azure Monitor: https://learn.microsoft.com/en-us/azure/azure-monitor/data-collection/data-collection-rule-samples
- Microsoft Learn: Structure of a data collection rule in Azure Monitor: https://learn.microsoft.com/en-us/azure/azure-monitor/essentials/data-collection-rule-structure
- Microsoft Learn: Data collection endpoints in Azure Monitor: https://learn.microsoft.com/en-us/azure/azure-monitor/data-collection/data-collection-endpoint-overview
- Microsoft Learn: Azure CLI `az monitor log-analytics workspace table`: https://learn.microsoft.com/en-us/cli/azure/monitor/log-analytics/workspace/table
- Microsoft Learn: Azure CLI `az monitor data-collection endpoint`: https://learn.microsoft.com/en-us/cli/azure/monitor/data-collection/endpoint
- Microsoft Learn: Azure CLI `az monitor data-collection rule association`: https://learn.microsoft.com/en-us/cli/azure/monitor/data-collection/rule/association
- Microsoft Learn: Built-in policy definitions for Azure Monitor: https://learn.microsoft.com/en-us/azure/azure-monitor/fundamentals/policy-reference
- Azure Policy built-in definition source for Linux DCR/DCE association: https://github.com/Azure/azure-policy/blob/master/built-in-policies/policyDefinitions/Monitoring/AzureMonitor_DCRA_Linux_DINE.json

## Issues Found
- The DCR example was described as an ARM template, but the snippet is a DCR resource definition rather than a full deployable ARM template with parameters/resources wrapper. Changed the wording to "DCR resource definition."
- The custom text log DCR used the destination table stream name as the incoming custom stream and did not project all columns created in the custom table. Updated the incoming stream to `Custom-MyAppLogs`, kept `outputStream` as `Custom-MyAppLogs_CL`, and projected `TimeGenerated`, `RawData`, `Level`, `Message`, and `Source`.
- The standalone KQL transformation projected only `TimeGenerated`, `Level`, and `Message`, which did not match the earlier custom table schema. Updated it to include `RawData` and `Source`.
- The Azure Policy example used an outdated/non-matching policy display name and hard-coded policy ID. Updated it to look up the current built-in policy by its official display name and pass both `dcrResourceId` and `resourceType`, matching the current policy parameters.
- The troubleshooting section said the Azure Monitor Agent managed identity needs the "Monitoring Metrics Publisher" role on the DCR. That role requirement applies to other ingestion scenarios such as direct ingestion/metrics paths, not normal AMA custom text log collection from VMs. Replaced it with a more accurate RBAC note for creating DCRs, DCEs, custom tables, DCR associations, and policy assignments.

## Review Notes
- The local environment did not have the Azure CLI installed, so CLI syntax was checked against Microsoft Learn CLI reference documentation instead of local `az --help`.
- The DCR snippets for Windows Event Logs, Syslog, performance counters, text logs, and custom table creation are consistent with current Microsoft documentation after the corrections above.
