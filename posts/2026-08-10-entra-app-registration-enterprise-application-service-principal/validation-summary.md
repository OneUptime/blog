# Validation Summary: Microsoft Entra App Registration vs Enterprise Application vs Service Principal: What Is the Difference?

## Status

validated

## Post Type

Technical reference and operational guide

## Technologies Covered

- Microsoft Entra ID
- App registrations and application objects
- Enterprise applications and service principals
- Microsoft Graph v1.0
- Azure CLI
- OAuth 2.0 permissions and consent
- Azure role-based access control (Azure RBAC)
- Conditional Access for workload identities
- Microsoft Entra Agent ID

## Sources Consulted

- Application and service principal objects in Microsoft Entra ID — https://learn.microsoft.com/en-us/entra/identity-platform/app-objects-and-service-principals
- How and why applications are added to Microsoft Entra ID — https://learn.microsoft.com/en-us/entra/identity-platform/how-applications-are-added
- Register an application in Microsoft Entra ID — https://learn.microsoft.com/en-us/entra/identity-platform/quickstart-register-app
- Microsoft identity platform glossary — https://learn.microsoft.com/en-us/entra/identity-platform/developer-glossary
- Microsoft Graph `application` resource — https://learn.microsoft.com/en-us/graph/api/resources/application?view=graph-rest-1.0
- Microsoft Graph `servicePrincipal` resource — https://learn.microsoft.com/en-us/graph/api/resources/serviceprincipal?view=graph-rest-1.0
- Microsoft Graph `agentIdentity` resource — https://learn.microsoft.com/en-us/graph/api/resources/agentidentity?view=graph-rest-1.0
- Microsoft Graph `oAuth2PermissionGrant` resource — https://learn.microsoft.com/en-us/graph/api/resources/oauth2permissiongrant?view=graph-rest-1.0
- Azure CLI `az account` reference — https://learn.microsoft.com/en-us/cli/azure/account?view=azure-cli-latest
- Azure CLI `az ad app` reference — https://learn.microsoft.com/en-us/cli/azure/ad/app?view=azure-cli-latest
- Azure CLI `az ad sp` reference — https://learn.microsoft.com/en-us/cli/azure/ad/sp?view=azure-cli-latest
- Understand Azure role assignments — https://learn.microsoft.com/en-us/azure/role-based-access-control/role-assignments
- Conditional Access for workload identities — https://learn.microsoft.com/en-us/entra/identity/conditional-access/workload-identity
- Deletion and recovery of applications FAQ — https://learn.microsoft.com/en-us/entra/identity/enterprise-apps/delete-recover-faq
- Restore a soft-deleted enterprise application — https://learn.microsoft.com/en-us/entra/identity/enterprise-apps/restore-application
- Restore deleted item with Microsoft Graph — https://learn.microsoft.com/en-us/graph/api/directory-deleteditems-restore?view=graph-rest-1.0

## Issues Found

1. The application-object property list mentioned only delegated permissions. Microsoft Graph's `requiredResourceAccess` represents both delegated permissions and application permissions (app roles). The bullet now explicitly includes both permission types.
2. The post said Microsoft documents only three service-principal types. The current Microsoft Graph schema also exposes `ServiceIdentity` for Microsoft Entra Agent ID agent identities and `SocialIdp` for internal use. The text now identifies Application, Managed identity, and Legacy as the three traditional types from the application-model overview and notes the additional current Graph values.

## Review Notes

- The Microsoft Graph filter queries are valid on v1.0: `appId` supports the `eq` filter for both applications and service principals without advanced-query headers. Callers still need an authenticated Graph request with suitable directory-read permissions.
- The Azure CLI commands and their `--id`, `--query`, and output options are current. Both `az ad app show --id` and `az ad sp show --id` accept an Application (client) ID as shown.
- Conditional Access for workload identities currently supports directly targeted, tenant-owned single-tenant service principals. Microsoft and third-party SaaS or multitenant applications and managed identities aren't covered, and a Workload Identities Premium license is required to create or modify these policies. The post's phrase "supported workload identities" is therefore accurate.
- Microsoft's general application-object documentation still conflicts with its newer recovery-specific guidance about portal restoration of a home service principal. The post correctly follows the recovery FAQ updated June 15, 2026 and the dedicated recovery documentation: restoring an app registration in the admin center restores its corresponding service principal, while a Microsoft Graph restore requires the service principal to be restored explicitly. Service-principal policies such as Conditional Access must be reconfigured.
- All links in the post's Official Documentation section resolve to the intended Microsoft Learn pages.
