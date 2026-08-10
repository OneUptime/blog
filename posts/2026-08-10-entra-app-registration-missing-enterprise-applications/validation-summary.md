# Validation Summary: Why an Entra App Registration Does Not Appear Under Enterprise Applications

## Status
validated

## Post Type
Troubleshooting guide / technical reference

## Technologies Covered
- Microsoft Entra ID
- App registrations and application objects
- Enterprise applications and service principals
- Multitenant application consent and provisioning
- Microsoft Graph REST API v1.0
- Microsoft Graph PowerShell SDK
- Azure CLI
- Azure RBAC
- Conditional Access for workload identities
- Microsoft Entra soft deletion and recovery

## Sources Consulted
- Microsoft Entra application and service principal objects: https://learn.microsoft.com/en-us/entra/identity-platform/app-objects-and-service-principals
- How and why applications are added to Microsoft Entra ID: https://learn.microsoft.com/en-us/entra/identity-platform/how-applications-are-added
- View and filter Enterprise applications in the Microsoft Entra admin center: https://learn.microsoft.com/en-us/entra/identity/enterprise-apps/view-applications-portal
- Create an enterprise application from a multitenant application: https://learn.microsoft.com/en-us/entra/identity/enterprise-apps/create-service-principal-cross-tenant
- Microsoft Graph PowerShell `Get-MgApplication`: https://learn.microsoft.com/en-us/powershell/module/microsoft.graph.applications/get-mgapplication
- Microsoft Graph PowerShell `Get-MgServicePrincipal`: https://learn.microsoft.com/en-us/powershell/module/microsoft.graph.applications/get-mgserviceprincipal
- Microsoft Graph `servicePrincipal` creation API: https://learn.microsoft.com/en-us/graph/api/serviceprincipal-post-serviceprincipals
- Microsoft Graph deleted-items list API: https://learn.microsoft.com/en-us/graph/api/directory-deleteditems-list
- Microsoft Graph deleted-item restore API: https://learn.microsoft.com/en-us/graph/api/directory-deleteditems-restore
- Restore a soft-deleted enterprise application: https://learn.microsoft.com/en-us/entra/identity/enterprise-apps/restore-application
- Deletion and recovery of applications FAQ: https://learn.microsoft.com/en-us/entra/identity/enterprise-apps/delete-recover-faq
- Microsoft Entra PowerShell `Restore-EntraDeletedApplication`: https://learn.microsoft.com/en-us/powershell/module/microsoft.entra.applications/restore-entradeletedapplication
- Azure CLI `az ad sp` reference: https://learn.microsoft.com/en-us/cli/azure/ad/sp
- Manage Azure CLI subscriptions and active tenants: https://learn.microsoft.com/en-us/cli/azure/manage-azure-subscriptions-azure-cli
- Azure role assignment identifiers: https://learn.microsoft.com/en-us/azure/role-based-access-control/role-assignments
- Conditional Access for workload identities: https://learn.microsoft.com/en-us/entra/identity/conditional-access/workload-identity
- Microsoft Entra audit-log activities: https://learn.microsoft.com/en-us/entra/identity/monitoring-health/reference-audit-activities
- Retirement of service-principal-less authentication: https://learn.microsoft.com/en-us/entra/identity-platform/retire-service-principal-less-authentication

## Issues Found
- The Enterprise applications filter guidance used the noncurrent labels "assignment status" and "creation source" and referred to a gallery-category filter that is not part of the current All applications view. Updated the text to use the documented **Application Type**, **Application Status**, **Application Visibility**, **Created on**, **Assignment required**, and **Owner** filters; it now directs readers to select **All Applications** and use **Application ID starts with** for the client ID.
- The Azure CLI guidance said not to infer the tenant from the active subscription, but changing to a subscription in another tenant changes Azure CLI's active tenant. Updated the text to verify the tenant with `az account show --query tenantId -o tsv` and, when needed, select it explicitly with `az login --tenant <tenant-id>`.

## Review Notes
- All Microsoft Graph PowerShell, Azure CLI, and HTTP examples are syntactically valid and use current, nondeprecated command and API surfaces. The `appId` equality filters do not require an advanced-query consistency header.
- The raw Graph operations require an authenticated caller with the relevant directory permissions and, for delegated restore operations, a supported Microsoft Entra administrator role. The post correctly scopes its examples to an authenticated session in the intended tenant.
- Microsoft documents March 31, 2026 as the deadline for blocking service-principal-less app-only authentication by non-Microsoft multitenant applications. The post's March 2026 statement is current.
- Microsoft documentation contains a recovery inconsistency: the older general object-model page says an App registrations UI restore does not restore the service principal, while the newer June 2026 recovery FAQ and the dedicated enterprise-application recovery guide say portal restoration restores the corresponding soft-deleted service principal. The post explicitly follows and attributes the current recovery-specific guidance; Graph or PowerShell restoration of only the application still requires separately restoring the service principal.
- All external documentation links in the post resolve to the intended Microsoft Learn resources.
