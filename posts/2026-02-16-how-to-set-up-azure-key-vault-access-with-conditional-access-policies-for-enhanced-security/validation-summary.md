# Validation Summary: How to Set Up Azure Key Vault Access with Conditional Access Policies

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Azure Key Vault
- Microsoft Entra ID Conditional Access
- Microsoft Graph PowerShell
- Azure CLI
- Azure RBAC
- Key Vault firewall and network rules
- Azure Monitor / Log Analytics KQL

## Sources Consulted
- Azure Key Vault security guidance: https://learn.microsoft.com/en-us/azure/key-vault/general/secure-key-vault
- Azure Key Vault authentication: https://learn.microsoft.com/en-us/azure/key-vault/general/authentication
- Azure Key Vault RBAC guide: https://learn.microsoft.com/en-us/azure/key-vault/general/rbac-guide
- Azure CLI `az keyvault` reference: https://learn.microsoft.com/en-us/cli/azure/keyvault
- Microsoft Graph PowerShell `New-MgIdentityConditionalAccessNamedLocation`: https://learn.microsoft.com/en-us/powershell/module/microsoft.graph.identity.signins/new-mgidentityconditionalaccessnamedlocation
- Microsoft Graph PowerShell `New-MgIdentityConditionalAccessPolicy`: https://learn.microsoft.com/en-us/powershell/module/microsoft.graph.identity.signins/new-mgidentityconditionalaccesspolicy
- Microsoft Graph `conditionalAccessClientApplications` resource: https://learn.microsoft.com/en-us/graph/api/resources/conditionalaccessclientapplications
- Microsoft Entra Conditional Access for workload identities: https://learn.microsoft.com/en-us/entra/identity/conditional-access/workload-identity
- Microsoft Entra Conditional Access target resources: https://learn.microsoft.com/en-us/entra/identity/conditional-access/concept-conditional-access-cloud-apps
- Azure Key Vault service principal application ID reference: https://learn.microsoft.com/en-us/azure/key-vault/secrets/overview-storage-keys

## Issues Found
- The prerequisites and policy-targeting text implied that the Azure management cloud app was the right umbrella for Key Vault secret/key/certificate access. Updated the text to distinguish Key Vault data-plane access from Azure portal, Azure CLI, Azure PowerShell, and ARM management-plane operations.
- The Microsoft Graph Conditional Access policy examples were missing `clientAppTypes`. Added `clientAppTypes = @("all")` to align with the documented Conditional Access policy schema and Graph PowerShell examples.
- The workload identity policy used `includeServicePrincipals = @("All")`, but Microsoft Graph documents service principal object IDs or `ServicePrincipalsInMyTenant` for that field. Changed it to `ServicePrincipalsInMyTenant`.
- The service principal section implied user-targeted MFA/device policies would directly block application-only service principal access. Clarified that application-only sign-ins are handled through Conditional Access for workload identities.
- The post grouped managed identities with service principals for workload identity Conditional Access. Added a caveat that managed identities are not covered by Conditional Access for workload identities and should be protected with Key Vault network controls, RBAC scoping, and monitoring.
- Added the Workload ID Premium licensing requirement for workload identity Conditional Access policies.

## Review Notes
The Azure CLI examples for `az keyvault update`, `az role assignment create`, and `az keyvault network-rule add` match current Microsoft CLI documentation. The named location example matches Microsoft Graph PowerShell examples. The KQL query is plausible for Entra sign-in logs, but real tenants may need to adjust resource display name filters based on how Key Vault sign-ins appear in their exported logs.
