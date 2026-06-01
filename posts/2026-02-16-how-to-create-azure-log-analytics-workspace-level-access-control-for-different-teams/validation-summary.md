# Validation Summary: How to Create Azure Log Analytics Workspace-Level Access Control

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Azure Log Analytics
- Azure Monitor Logs
- Azure RBAC and custom roles
- Log Analytics workspace access control modes
- Table-level and granular RBAC
- Azure CLI
- Kusto Query Language (KQL)
- Azure Monitor diagnostic settings

## Sources Consulted
- Microsoft Learn: Manage access to Log Analytics workspaces - https://learn.microsoft.com/en-us/azure/azure-monitor/logs/manage-access
- Microsoft Learn: Manage table-level access in a Log Analytics workspace - https://learn.microsoft.com/en-us/azure/azure-monitor/logs/manage-table-access
- Microsoft Learn: Audit queries in Azure Monitor Logs - https://learn.microsoft.com/en-us/azure/azure-monitor/logs/query-audit
- Microsoft Learn: LAQueryLogs table reference - https://learn.microsoft.com/en-us/azure/azure-monitor/reference/tables/laquerylogs
- Microsoft Learn: Azure CLI `az monitor log-analytics workspace` reference - https://learn.microsoft.com/en-us/cli/azure/monitor/log-analytics/workspace
- Microsoft Learn: Azure CLI `az monitor diagnostic-settings` reference - https://learn.microsoft.com/en-us/cli/azure/monitor/diagnostic-settings
- Microsoft Learn: Azure custom roles - https://learn.microsoft.com/en-us/azure/role-based-access-control/custom-roles
- Microsoft Learn: Cross-workspace queries - https://learn.microsoft.com/en-us/azure/azure-monitor/logs/api/cross-workspace-queries

## Issues Found
- The post assigned `Log Analytics Reader` to the security team and then later claimed a table-specific custom role would restrict that same team. This was incorrect because broad Reader/Contributor roles override table-level restrictions and grant access to all workspace data. I changed the broad-reader example to an operations team and added a note that restricted users must not also have broad Reader, Contributor, or Log Analytics Reader assignments.
- The table-level RBAC section used `az monitor log-analytics workspace table update --plan Analytics` as though it granted table read access. That command updates table properties such as the table plan; it does not assign access. I removed the command and kept the custom-role assignment pattern.
- The post described legacy table-specific role actions as the most granular current approach. Microsoft now recommends granular RBAC using `Microsoft.OperationalInsights/workspaces/tables/data/read` with role assignment conditions. I updated the section to distinguish recommended granular RBAC from the legacy table-specific action method shown in the examples.
- The post said the security team could query "the four tables" in a role definition that listed more than four table actions. I changed this to "the tables listed."
- The resource-context developer example said the developer can query "the workspace." I clarified that this applies when querying from the resource context.

## Review Notes
The remaining Azure CLI role assignment examples use placeholder assignees and subscription IDs, which is appropriate for a guide. The Azure CLI was not installed in the local environment, so command validation was performed against Microsoft Learn CLI reference documentation rather than local `az --help` output.
