# Validation Summary: How to Configure Azure Managed Grafana Role-Based Access Control

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Managed Grafana
- Azure RBAC
- Microsoft Entra ID groups
- Grafana teams
- Grafana folder and data source permissions
- Grafana HTTP API
- Azure CLI
- Azure Monitor diagnostic settings

## Sources Consulted
- Microsoft Learn: Manage access and permissions for users and identities in Azure Managed Grafana: https://learn.microsoft.com/en-us/azure/managed-grafana/how-to-manage-access-permissions-users-identities
- Microsoft Learn: Configure Grafana Team Sync with Microsoft Entra groups: https://learn.microsoft.com/en-us/azure/managed-grafana/how-to-sync-teams-with-entra-groups
- Microsoft Learn: Azure Managed Grafana service limits and constraints: https://learn.microsoft.com/en-us/azure/managed-grafana/known-limitations
- Microsoft Learn: Monitor Azure Managed Grafana using diagnostic settings: https://learn.microsoft.com/en-us/azure/managed-grafana/how-to-monitor-managed-grafana-workspace
- Microsoft Learn: Azure CLI `az grafana service-account`: https://learn.microsoft.com/en-us/cli/azure/grafana/service-account
- Microsoft Learn: Azure CLI `az grafana service-account token`: https://learn.microsoft.com/en-us/cli/azure/grafana/service-account/token
- Microsoft Learn: Azure CLI `az monitor diagnostic-settings`: https://learn.microsoft.com/en-us/cli/azure/monitor/diagnostic-settings
- Grafana documentation: Team HTTP API: https://grafana.com/docs/grafana/latest/developers/http_api/team/
- Grafana documentation: Folder permissions HTTP API: https://grafana.com/docs/grafana/latest/developers/http_api/folder_permissions/
- Grafana documentation: Data source permissions: https://grafana.com/docs/grafana/latest/administration/data-source-management/#data-source-permissions

## Issues Found
- The post said Microsoft provides three built-in Azure Managed Grafana roles. Updated it to include the current fourth role, Grafana Limited Viewer.
- The post described Azure RBAC as the maximum access level. Updated the explanation because Azure Managed Grafana granular permissions can adjust default access for specific folders and dashboards, including allowing a viewer to edit or preventing an editor from editing.
- The role assignment example claimed to grant Grafana Viewer to all authenticated users in a tenant. Updated the example to assign the role to a Microsoft Entra group, which matches Azure RBAC role assignment behavior.
- The post used outdated UI labels and Azure AD naming for team sync. Updated the team sync instructions to use Microsoft Entra groups and the Azure portal path for Microsoft Entra Team Sync Settings.
- The post used `az grafana api-call`, which is not present in the current Azure CLI Grafana command reference. Replaced those examples with Grafana HTTP API calls using `curl` and a service account token.
- The data source permissions section implied Grafana Enterprise features are simply available in the Standard tier. Clarified that Grafana Enterprise can be enabled for Standard tier with licensing costs.
- The auditing example used `/api/admin/settings` as though it showed audit logs. Replaced it with Azure Monitor diagnostic settings for Azure Managed Grafana login events.
- Updated "Azure AD groups" in best practices to "Microsoft Entra groups" to match current Microsoft terminology.

## Review Notes
The Azure CLI was not installed in the local environment, so command validation was performed against current Microsoft Learn CLI reference pages instead of local `az --help` output.
