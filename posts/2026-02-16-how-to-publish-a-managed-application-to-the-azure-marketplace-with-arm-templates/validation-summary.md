# Validation Summary: How to Publish a Managed Application to the Azure Marketplace with ARM Templates

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Azure Managed Applications
- Azure Marketplace / Partner Center
- Azure Resource Manager templates
- createUiDefinition.json
- Azure CLI
- Azure App Service
- Azure SQL Database
- Azure RBAC custom roles

## Sources Consulted
- Azure Managed Applications overview: https://learn.microsoft.com/en-us/azure/azure-resource-manager/managed-applications/overview
- CreateUiDefinition overview: https://learn.microsoft.com/en-us/azure/azure-resource-manager/managed-applications/create-uidefinition-overview
- Microsoft.Common.TextBox UI element: https://learn.microsoft.com/en-us/azure/azure-resource-manager/managed-applications/microsoft-common-textbox
- Microsoft.Common.PasswordBox UI element: https://learn.microsoft.com/en-us/azure/azure-resource-manager/managed-applications/microsoft-common-passwordbox
- Microsoft.Common.DropDown UI element: https://learn.microsoft.com/en-us/azure/azure-resource-manager/managed-applications/microsoft-common-dropdown
- Test the UI definition file: https://learn.microsoft.com/en-us/azure/azure-resource-manager/managed-applications/test-createuidefinition
- Plan an Azure managed application for an Azure application offer: https://learn.microsoft.com/en-us/partner-center/marketplace-offers/plan-azure-app-managed-app
- Configure a managed application plan: https://learn.microsoft.com/en-us/partner-center/marketplace-offers/azure-app-managed
- Azure CLI `az deployment group validate`: https://learn.microsoft.com/en-us/cli/azure/deployment/group
- Azure CLI `az storage blob upload`: https://learn.microsoft.com/en-us/cli/azure/storage/blob
- ARM template reference for Microsoft.Web/sites: https://learn.microsoft.com/en-us/azure/templates/microsoft.web/sites
- ARM template reference for Microsoft.Web/serverfarms: https://learn.microsoft.com/en-us/azure/templates/microsoft.web/serverfarms
- ARM template reference for Microsoft.Sql/servers: https://learn.microsoft.com/en-us/azure/templates/microsoft.sql/2023-08-01/servers
- ARM template reference for Microsoft.Sql/servers/databases: https://learn.microsoft.com/en-us/azure/templates/microsoft.sql/2023-08-01/servers/databases

## Issues Found
- The post described publisher management access as inherent to every managed application. Updated the wording to reflect that publisher management access is configurable and optional in current Azure Managed Applications.
- The post called both `createUiDefinition.json` and `mainTemplate.json` ARM templates. Updated the wording to distinguish the UI definition artifact from the ARM deployment template.
- The managed application explanation implied customers can never modify managed resources directly. Updated it to reflect default deny-assignment behavior and the availability of customer access and allowed customer actions.
- The ARM template used older preview API versions for Azure SQL resources. Updated `Microsoft.Sql/servers` and `Microsoft.Sql/servers/databases` to the stable `2023-08-01` API version.
- The `Microsoft.Common.TextBox` example used direct `regex` and `validationMessage` fields. Updated it to the current `constraints.validations` array with `regex` and `message`.
- The ARM validation command used a fixed app name that is likely to fail global name availability checks. Updated it to use `testapp$RANDOM`.
- The UI sandbox instructions generated an older deep link with encoded file contents. Updated them to the current Create UI Definition Sandbox URL and paste/preview workflow.
- The Partner Center authorization example referred to Azure AD and suggested a management group principal or custom role. Updated it to Microsoft Entra terminology and the current Partner Center model using user, group, or application object IDs with built-in roles.
- The custom-role section implied custom RBAC roles could be assigned directly in a Marketplace plan authorization. Clarified that Partner Center managed application plans use built-in roles, while custom role definitions are applicable when creating managed application definitions directly, such as for service catalog scenarios.

## Review Notes
The sample template remains intentionally minimal. A production Marketplace package should also run the ARM template test toolkit, validate resource-name availability, configure networking and database access explicitly, and avoid exposing database credentials or connection details through app settings unless protected by a stronger secret-management pattern.
