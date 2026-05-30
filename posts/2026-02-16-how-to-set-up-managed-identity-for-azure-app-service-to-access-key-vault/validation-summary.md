# Validation Summary: How to Set Up Managed Identity for Azure App Service to Access Key Vault

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure App Service
- Azure Managed Identity
- Microsoft Entra ID
- Azure Key Vault
- Azure RBAC
- Azure CLI
- Azure SDK for .NET
- Azure SDK for JavaScript
- Azure SDK for Python

## Sources Consulted
- Microsoft Learn: Use Key Vault references as app settings in Azure App Service, Azure Functions, and Azure Logic Apps (Standard): https://learn.microsoft.com/en-us/azure/app-service/app-service-key-vault-references
- Microsoft Learn: Use managed identities for App Service and Azure Functions: https://learn.microsoft.com/en-us/azure/app-service/overview-managed-identity
- Microsoft Learn: Developer introduction and guidelines for managed identities for Azure resources: https://learn.microsoft.com/en-us/entra/identity/managed-identities-azure-resources/overview-for-developers
- Microsoft Learn: Provide access to Key Vault keys, certificates, and secrets with Azure role-based access control: https://learn.microsoft.com/en-us/azure/key-vault/general/rbac-guide
- Microsoft Learn: Azure RBAC vs. access policies for Azure Key Vault: https://learn.microsoft.com/en-us/azure/key-vault/general/rbac-access-policy
- Microsoft Learn: Azure CLI `az webapp identity`: https://learn.microsoft.com/en-us/cli/azure/webapp/identity
- Microsoft Learn: Azure CLI `az keyvault`: https://learn.microsoft.com/en-us/cli/azure/keyvault
- Microsoft Learn: Azure CLI `az keyvault secret`: https://learn.microsoft.com/en-us/cli/azure/keyvault/secret
- Microsoft Learn: Azure CLI `az role assignment`: https://learn.microsoft.com/en-us/cli/azure/role/assignment
- Microsoft Learn: Azure CLI `az identity`: https://learn.microsoft.com/en-us/cli/azure/identity

## Issues Found
- The post referred to Azure Active Directory. Updated this to Microsoft Entra ID, the current product name used in Microsoft documentation.
- The user-assigned identity flow saved only the resource ID and client ID. Added the identity principal ID because Key Vault RBAC assignments need the service principal/object ID for the identity.
- The Key Vault creation command did not explicitly enable the RBAC permission model even though the post recommends RBAC and uses Azure RBAC role assignments. Added `--enable-rbac-authorization true`.
- The RBAC Key Vault creation path added secrets immediately, but the signed-in user may not have data-plane secret permissions on an RBAC-enabled vault. Added a `Key Vault Secrets Officer` role assignment for the signed-in user before the `az keyvault secret set` commands.
- The managed identity RBAC command only retrieved the system-assigned identity principal ID. Added a note showing that user-assigned identity setups should use the user-assigned identity's principal ID instead.
- The Key Vault resource lookup in the RBAC section omitted the resource group. Added `--resource-group my-resource-group` for consistency and to avoid ambiguity.
- The Key Vault reference examples used trailing slashes in secret URIs. Updated them to the documented `https://<vault>.vault.azure.net/secrets/<secret-name>` format.
- The post did not mention that Key Vault references use the system-assigned identity by default. Added the required `az webapp update --set keyVaultReferenceIdentity=$IDENTITY_ID` command for user-assigned identity setups.
- The Node.js example used CommonJS `require` with top-level `await`, which is not valid in a normal CommonJS file. Wrapped the usage in an async `main()` function.
- The SDK examples did not explain how `DefaultAzureCredential` selects a user-assigned managed identity. Added a note to set `AZURE_CLIENT_ID` or pass the client ID in credential options when using a user-assigned identity.

## Review Notes
Azure RBAC role assignments can take time to propagate, so newly created Key Vault references or SDK calls may fail briefly after role assignment even when the commands are correct. The post's statement that unversioned Key Vault references refresh within 24 hours or after an app restart is consistent with Microsoft documentation.
