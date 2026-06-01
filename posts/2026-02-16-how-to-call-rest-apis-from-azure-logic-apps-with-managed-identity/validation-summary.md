# Validation Summary: How to Call REST APIs from Azure Logic Apps with Managed Identity

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Logic Apps Standard
- Managed identities for Azure resources
- Microsoft Entra ID authentication
- Azure CLI
- Azure RBAC
- Azure Resource Manager REST API
- Azure Key Vault REST API
- Azure Storage Blob REST API
- Microsoft Graph API
- Bicep / ARM resource definitions

## Sources Consulted
- Azure Logic Apps managed identity authentication: https://learn.microsoft.com/en-us/azure/logic-apps/authenticate-with-managed-identity
- Azure CLI `az logic workflow identity` reference: https://learn.microsoft.com/en-us/cli/azure/logic/workflow/identity
- Azure CLI `az logicapp` reference: https://learn.microsoft.com/en-us/cli/azure/logicapp
- Azure CLI `az webapp identity` reference: https://learn.microsoft.com/en-us/cli/azure/webapp/identity
- Azure App Service managed identity documentation: https://learn.microsoft.com/en-us/azure/app-service/overview-managed-identity
- Azure RBAC role assignment with Azure CLI: https://learn.microsoft.com/en-us/azure/role-based-access-control/role-assignments-cli
- Assign a managed identity to an application role with Azure CLI: https://learn.microsoft.com/en-us/entra/identity/managed-identities-azure-resources/assign-app-role-managed-identity-azure-cli
- Azure Storage REST authorization with Microsoft Entra ID: https://learn.microsoft.com/en-us/rest/api/storageservices/authorize-with-azure-active-directory
- Microsoft identity platform scopes and resource identifiers: https://learn.microsoft.com/en-us/entra/identity-platform/scopes-oidc

## Issues Found
- The post used `az logicapp identity assign` and `az logicapp identity show`, but the current Azure CLI `az logicapp` command group does not expose an `identity` subcommand for Logic App Standard. Updated the examples to use `az webapp identity assign` and `az webapp identity show`, which apply to Logic App Standard because it is a `Microsoft.Web/sites` resource with `kind: functionapp,workflowapp`.
- The custom API permission example used `az ad app permission grant` with the managed identity principal ID. Managed identities need application role assignments against the target service principal for app-to-app authorization. Replaced the command with an app role creation example and an `az rest` call to create the service principal `appRoleAssignment`.
- The Azure Storage REST example omitted the date header and did not show the required data-plane RBAC grant. Added `x-ms-date` and a `Storage Blob Data Reader` role assignment example so the List Blobs call can be authorized with Microsoft Entra ID.
- The Microsoft Graph note implied a generic API permission/admin consent flow. Updated it to state that the managed identity needs the appropriate Microsoft Graph application role assignment and tenant admin consent.
- The troubleshooting identity verification command used the same incorrect `az logicapp identity show` command. Updated it to `az webapp identity show`.

## Review Notes
- Azure documentation now generally uses "Microsoft Entra ID" rather than "Azure AD". The post still uses "Azure AD" in some prose and tags, which is understandable but could be modernized in a future editorial pass.
- The Bicep snippet is intentionally partial because the Logic App Standard `Microsoft.Web/sites` resource omits required hosting/storage settings. It is acceptable as an identity and role-assignment excerpt, but it is not a complete deployable Logic App Standard template as written.
- Azure CLI and Bicep were not installed in the local workspace, so command and resource validation was performed against official Microsoft documentation rather than local CLI help.
