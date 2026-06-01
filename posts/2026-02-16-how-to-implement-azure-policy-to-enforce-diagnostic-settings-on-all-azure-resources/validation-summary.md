# Validation Summary: How to Use Azure Policy to Enforce Diagnostic Settings on All Azure Resources

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Azure Policy
- Azure Policy initiatives
- DeployIfNotExists policy effect
- Azure Monitor diagnostic settings
- Log Analytics workspaces
- Azure Resource Graph
- Azure CLI
- ARM templates
- KQL

## Sources Consulted
- Microsoft Learn: Diagnostic settings in Azure Monitor: https://learn.microsoft.com/en-us/azure/azure-monitor/platform/diagnostic-settings
- Microsoft Learn: Create diagnostic settings at scale by using built-in Azure policies: https://learn.microsoft.com/en-us/azure/azure-monitor/platform/diagnostic-settings-policy-built-in
- Microsoft Learn: Create diagnostic settings at scale by using custom Azure policies: https://learn.microsoft.com/en-us/azure/azure-monitor/platform/diagnostic-settings-policy
- Microsoft Learn: Azure Policy DeployIfNotExists effect: https://learn.microsoft.com/en-us/azure/governance/policy/concepts/effect-deploy-if-not-exists
- Microsoft Learn: Microsoft.Insights/diagnosticSettings ARM template reference: https://learn.microsoft.com/en-us/azure/templates/microsoft.insights/diagnosticsettings
- Microsoft Learn: Supported logs for Microsoft.Web/sites: https://learn.microsoft.com/en-us/azure/azure-monitor/reference/supported-logs/microsoft-web-sites-logs
- Microsoft Learn: Azure CLI az policy assignment: https://learn.microsoft.com/en-us/cli/azure/policy/assignment
- Microsoft Learn: Azure CLI az policy remediation: https://learn.microsoft.com/en-us/cli/azure/policy/remediation
- Microsoft Learn: Get Azure Policy compliance data: https://learn.microsoft.com/en-us/azure/governance/policy/how-to/get-compliance-data
- Microsoft Learn: Azure Resource Graph sample queries for Azure Policy: https://learn.microsoft.com/en-us/azure/governance/policy/samples/resource-graph-samples

## Issues Found
- The introduction incorrectly said every Azure resource can generate diagnostic logs and that none of the data is collected by default. Updated it to distinguish resource logs, platform metrics, and activity log behavior.
- The DeployIfNotExists explanation implied immediate remediation for new resources. Updated it to reflect Azure Policy evaluation after create or update success and remediation behavior.
- The post said one policy assignment is needed per resource type even though initiatives allow one assignment containing multiple definitions. Updated the wording to policy definitions or a built-in initiative.
- The built-in policy discovery query used a case-sensitive `contains(displayName,'diagnostic')` filter and filtered out diagnostic policies categorized outside Monitoring. Updated the query.
- The SQL built-in policy display name and lookup did not match current Azure built-in naming. Updated the example to the current SQL Databases diagnostic settings wording.
- The initiative example lacked `policyDefinitionReferenceId` values, which are needed when creating remediation tasks for policies inside an initiative. Added stable reference IDs and updated remediation examples to use them.
- The custom policy existence condition only checked for any enabled log and the workspace, which could mark incomplete diagnostic settings compliant. Updated it to count the required App Service log categories and AllMetrics metric.
- The custom ARM template included a `location` property for `Microsoft.Insights/diagnosticSettings`, which is not part of the documented resource schema. Removed the location parameter and property.
- The custom policy creation command pointed `--rules` at a full policy definition. Updated the instructions to save `policyRule` and `parameters` separately and pass both files to `az policy definition create`.
- The compliance query used a `PolicyStates_CL` Log Analytics custom table that is not the standard way to query Azure Policy state. Replaced it with an Azure Resource Graph query over `PolicyResources`.

## Review Notes
- The local environment did not have the Azure CLI installed, so CLI syntax was verified against Microsoft Learn CLI documentation instead of local `az --help`.
- The post intentionally keeps explicit log categories in the custom App Service example. In future revisions, category groups such as `allLogs` may reduce maintenance where the resource type supports them.
