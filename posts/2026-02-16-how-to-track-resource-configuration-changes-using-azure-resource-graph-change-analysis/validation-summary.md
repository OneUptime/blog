# Validation Summary: Track Resource Configuration Changes Using Azure Resource Graph Change Analysis

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Resource Graph
- Azure Resource Graph Change Analysis
- Kusto Query Language (KQL)
- Azure CLI
- Azure PowerShell
- Azure Activity Log
- Azure Automation
- Azure App Service

## Sources Consulted
- Azure Resource Graph: Get resource changes: https://learn.microsoft.com/en-us/azure/governance/resource-graph/changes/get-resource-changes
- Azure Resource Graph Change Analysis overview: https://learn.microsoft.com/en-us/azure/azure-monitor/change/change-analysis
- Azure Resource Graph Change Analysis portal experience: https://learn.microsoft.com/en-us/azure/azure-monitor/change/change-analysis-enable
- Azure CLI `az graph` reference: https://learn.microsoft.com/en-us/cli/azure/graph
- Azure Resource Graph CLI quickstart: https://learn.microsoft.com/en-us/azure/governance/resource-graph/shared-query-azure-cli
- Azure PowerShell `Search-AzGraph` reference: https://learn.microsoft.com/en-us/powershell/module/az.resourcegraph/search-azgraph
- Azure Monitor Activity Log documentation: https://learn.microsoft.com/en-us/azure/azure-monitor/platform/activity-log-insights

## Issues Found
- The post described enabling web app in-guest change tracking with `Microsoft.ChangeAnalysis` and `CHANGE_ANALYSIS_ENABLED=true`. Current Azure Resource Graph Change Analysis documentation states that Azure Resource Graph does not currently support App Service file and configuration changes. I replaced that section with the supported Resource Graph enablement model and the Azure CLI Resource Graph extension command.
- The post claimed Resource Graph-based change tracking works out of the box for all ARM resources. The current documentation scopes support to changes from the Resource Graph `resources`, `resourcecontainers`, and `healthresources` tables and ARM control plane operations. I changed the wording to "supported" ARM control plane changes.
- The portal section said every resource has a "Change Analysis" tab under "Diagnose and solve problems" and that web apps show both ARM-level and in-guest changes. I updated it to match the current portal guidance: search for "Change Analysis" in the Azure portal, and App Service resources show supported ARM-level changes only.
- The PowerShell alert example projected `properties.targetResourceId` but later read `$change.targetResourceId`. I added an explicit `targetResourceId` extension and projected that column so the PowerShell object property matches the script.
- The `changedByType` explanation was too narrow. I updated it to include the broader actor types documented for Change Analysis, including system and unspecified actors.

## Review Notes
The main `resourcechanges` KQL examples match the documented Resource Graph change payload pattern: `properties.changeAttributes.timestamp`, `properties.changeType`, `properties.targetResourceId`, `properties.targetResourceType`, and `properties.changes` with `previousValue` and `newValue`. Azure CLI was not installed in the local environment, so CLI syntax was verified against Microsoft Learn rather than local `az --help`.
