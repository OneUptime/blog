# Validation Summary: How to Set Up Azure Key Vault with RBAC Authorization Instead of Access Policies

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Key Vault
- Azure role-based access control (Azure RBAC)
- Key Vault access policies
- Azure PowerShell Az.KeyVault and Az.Resources cmdlets
- Azure CLI
- Microsoft Entra ID service principals and groups

## Sources Consulted
- Microsoft Learn: Provide access to Key Vault keys, certificates, and secrets with Azure role-based access control, https://learn.microsoft.com/en-us/azure/key-vault/general/rbac-guide
- Microsoft Learn: Azure role-based access control (Azure RBAC) vs. access policies, https://learn.microsoft.com/en-us/azure/key-vault/general/rbac-access-policy
- Microsoft Learn: Migrate to Azure RBAC from access policies, https://learn.microsoft.com/en-us/azure/key-vault/general/rbac-migration
- Microsoft Learn: Prepare for Key Vault API version 2026-02-01 and later, https://learn.microsoft.com/en-us/azure/key-vault/general/access-control-default
- Microsoft Learn: az keyvault command reference, https://learn.microsoft.com/en-us/cli/azure/keyvault
- Microsoft Learn: New-AzKeyVault cmdlet reference, https://learn.microsoft.com/en-us/powershell/module/az.keyvault/new-azkeyvault
- Microsoft Learn: Update-AzKeyVault cmdlet reference, https://learn.microsoft.com/en-us/powershell/module/az.keyvault/update-azkeyvault
- Microsoft Learn: Set-AzKeyVaultSecret cmdlet reference, https://learn.microsoft.com/en-us/powershell/module/az.keyvault/set-azkeyvaultsecret
- Microsoft Learn: Azure built-in roles for Security, https://learn.microsoft.com/en-us/azure/role-based-access-control/built-in-roles/security
- Microsoft Learn: Steps to assign an Azure role, https://learn.microsoft.com/en-us/azure/role-based-access-control/role-assignments-steps

## Issues Found
- The PowerShell examples used `-EnableRbacAuthorization` with `New-AzKeyVault` and `Update-AzKeyVault`. Current Az.KeyVault documentation uses `-DisableRbacAuthorization`; for new vaults, RBAC is now the default, and for migration the current equivalent is `-DisableRbacAuthorization $false`. Updated both examples.
- The comparison table said Azure RBAC has "No limit." Azure RBAC has role assignment limits, including subscription-level limits. Updated the table to say Azure RBAC role assignment limits apply.
- The role table and admin setup text implied `Key Vault Administrator` can manage the vault resource. Microsoft documents this as a data plane role that cannot manage the Key Vault resource or role assignments. Updated the description and admin setup wording.

## Review Notes
- Microsoft recommends assigning Key Vault data plane roles at the vault scope for most applications and using individual secret/key/certificate scopes only for limited scenarios. The post's individual-secret example is valid, but broad use of object-level assignments should be planned carefully.
- Microsoft recommends using role IDs instead of role names in automation so scripts continue to work if role names change. The post uses role names for readability, which is acceptable for a tutorial.
