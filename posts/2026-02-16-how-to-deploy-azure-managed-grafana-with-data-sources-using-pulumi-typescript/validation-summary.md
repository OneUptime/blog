# Validation Summary: How to Deploy Azure Managed Grafana with Data Sources Using Pulumi TypeScript

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Managed Grafana
- Azure Monitor and Log Analytics
- Azure Monitor managed service for Prometheus
- Pulumi Azure Native
- Pulumi TypeScript
- Azure CLI
- Azure RBAC and managed identities
- Microsoft Entra ID / Azure AD groups

## Sources Consulted
- Microsoft Learn: Azure Managed Grafana overview and service tiers: https://learn.microsoft.com/en-us/azure/managed-grafana/overview
- Microsoft Learn: Manage access and permissions for Azure Managed Grafana users and identities: https://learn.microsoft.com/en-us/azure/managed-grafana/how-to-manage-access-permissions-users-identities
- Microsoft Learn: Use Azure Managed Grafana with Azure Monitor: https://learn.microsoft.com/en-us/azure/azure-monitor/visualize/visualize-use-managed-grafana-how-to
- Microsoft Learn: Add an Azure Monitor workspace to Azure Managed Grafana: https://learn.microsoft.com/en-us/azure/managed-grafana/how-to-connect-azure-monitor-workspace
- Microsoft Learn: Azure Managed Grafana authentication and permissions: https://learn.microsoft.com/en-us/azure/managed-grafana/how-to-authentication-permissions
- Microsoft Learn: Azure built-in Monitor roles: https://learn.microsoft.com/en-us/azure/role-based-access-control/built-in-roles/monitor
- Microsoft Learn Azure CLI reference: az grafana data-source: https://learn.microsoft.com/en-us/cli/azure/grafana/data-source
- Microsoft Learn Azure CLI reference: az grafana dashboard: https://learn.microsoft.com/en-us/cli/azure/grafana/dashboard
- Pulumi Registry: azure-native.dashboard.Grafana: https://www.pulumi.com/registry/packages/azure-native/api-docs/dashboard/grafana/
- Pulumi Registry: azure-native.resources.AzureCliScript: https://www.pulumi.com/registry/packages/azure-native/api-docs/resources/azurecliscript/
- Pulumi Registry: azure-native.managedidentity.UserAssignedIdentity: https://www.pulumi.com/registry/packages/azure-native/api-docs/managedidentity/userassignedidentity/
- Pulumi Registry: azure-native.monitor.AzureMonitorWorkspace: https://www.pulumi.com/registry/packages/azure-native/api-docs/monitor/azuremonitorworkspace/
- Pulumi Registry: azure-native.operationalinsights.Workspace: https://www.pulumi.com/registry/packages/azure-native/api-docs/operationalinsights/workspace/
- Grafana documentation: Azure Monitor data source provisioning and managed identity: https://grafana.com/docs/grafana/latest/datasources/azuremonitor/

## Issues Found
- The post claimed Azure Managed Grafana provides "Grafana 10.x"; this is too version-specific and outdated for a managed service with automatic updates. Changed it to a managed Grafana workspace with automatic version updates.
- The service tier description omitted that Essential is a preview tier being replaced for new use cases. Updated the wording to match Microsoft guidance that Standard is recommended for new workspaces.
- The Pulumi Managed Grafana resource used `azure.dashboard.GrafanaResource`, but the Azure Native resource is `azure.dashboard.Grafana`. Updated the code.
- The post said Azure Managed Grafana has three built-in roles, but Microsoft documents additional roles such as Grafana Limited Viewer. Updated the wording to describe the commonly assigned roles instead of claiming only three exist.
- The managed identity role assignments used an empty string fallback for `principalId`, which could create invalid role assignments. Updated these to use the system-assigned identity principal ID directly.
- The Prometheus integration code did not grant the Grafana managed identity Monitoring Data Reader on the Azure Monitor workspace. Added the required role assignment for Azure Monitor workspace/Prometheus access.
- The data source and dashboard scripts used `azure.resources.DeploymentScript` with nested `properties`, but Pulumi Azure Native exposes `azure.resources.AzureCliScript` with top-level script properties. Updated both scripts.
- The deployment script identity examples were placeholders or empty maps, which would not run. Added a user-assigned managed identity and granted it Grafana Admin on the workspace so Azure CLI Grafana commands can authenticate.
- The script examples used Azure CLI 2.50.0, while the `az grafana data-source` extension reference requires Azure CLI 2.61.0 or higher. Updated the deployment scripts to 2.61.0.
- The Azure Monitor data source definition included a default Log Analytics workspace field that was not part of the official Grafana provisioning example. Removed that field and retained the documented managed identity and subscription settings.
- The introduction described the "Grafana API itself" as well-typed in the Pulumi context. Adjusted this to refer to the Azure resource APIs, which is what the Pulumi Azure Native provider types.

## Review Notes
The post is now technically valid as a Pulumi/Azure Managed Grafana tutorial. The deployment script examples assume the referenced dashboard JSON file is available to the script execution environment; in a production implementation, dashboard JSON is usually embedded in the script, fetched from storage, or supplied by `supportingScriptUris`.
