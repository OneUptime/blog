# Validation Summary: How to Manage Azure Automation Credentials and Variables Securely

## Status
validated

## Post Type
Tutorial / security guide

## Technologies Covered
- Azure Automation
- Azure managed identities
- Azure Automation credentials and variables
- Azure Key Vault
- Azure CLI
- Azure PowerShell
- PowerShell runbooks

## Sources Consulted
- Microsoft Learn: Using a system-assigned managed identity for an Azure Automation account - https://learn.microsoft.com/en-us/azure/automation/enable-managed-identity-for-automation
- Microsoft Learn: Using a user-assigned managed identity for an Azure Automation account - https://learn.microsoft.com/en-us/azure/automation/add-user-assigned-identity
- Microsoft Learn: Set-AzAutomationAccount - https://learn.microsoft.com/en-us/powershell/module/az.automation/set-azautomationaccount
- Microsoft Learn: New-AzUserAssignedIdentity - https://learn.microsoft.com/en-us/powershell/module/az.managedserviceidentity/new-azuserassignedidentity
- Microsoft Learn: Manage credentials in Azure Automation - https://learn.microsoft.com/en-us/azure/automation/shared-resources/credentials
- Microsoft Learn: New-AzAutomationCredential - https://learn.microsoft.com/en-us/powershell/module/az.automation/new-azautomationcredential
- Microsoft Learn: Manage variables in Azure Automation - https://learn.microsoft.com/en-us/azure/automation/shared-resources/variables
- Microsoft Learn: New-AzAutomationVariable - https://learn.microsoft.com/en-us/powershell/module/az.automation/new-azautomationvariable
- Microsoft Learn: Encryption of secure assets in Azure Automation - https://learn.microsoft.com/en-us/azure/automation/automation-secure-asset-encryption
- Microsoft Learn: Azure CLI az automation account reference - https://learn.microsoft.com/en-us/cli/azure/automation/account
- Microsoft Learn: Azure CLI az keyvault set-policy reference - https://learn.microsoft.com/en-us/cli/azure/keyvault
- Microsoft Learn: Get-AzKeyVaultSecret - https://learn.microsoft.com/en-us/powershell/module/az.keyvault/get-azkeyvaultsecret
- Microsoft Learn: Configure cryptographic key auto-rotation in Azure Key Vault - https://learn.microsoft.com/en-us/azure/key-vault/keys/how-to-configure-key-rotation
- Microsoft Learn: Automate secret rotation with Azure Key Vault - https://learn.microsoft.com/en-us/azure/key-vault/secrets/tutorial-rotation
- Microsoft Learn: Send-MailMessage - https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.utility/send-mailmessage

## Issues Found
- The post used `az automation account update --assign-identity`, `--identity-type`, and `--user-assigned`, but the current Azure CLI Automation account update command does not expose those parameters. Replaced those examples with the documented `Set-AzAutomationAccount -AssignSystemIdentity` and `-AssignUserIdentity` Azure PowerShell pattern.
- The post used `az automation credential create` and `az automation variable create`, but the current official Azure CLI reference does not document those Automation asset creation commands. Replaced them with documented `New-AzAutomationCredential` and `New-AzAutomationVariable` examples.
- The credential runbook example used `Send-MailMessage`, which Microsoft marks obsolete because it does not guarantee secure SMTP connections. Replaced the example with a generic `Invoke-Command` usage that demonstrates passing the retrieved `PSCredential` without relying on the obsolete mail cmdlet.
- The rotation section said Key Vault supports automatic rotation for certain secret types. Updated the wording to distinguish automatic key rotation from event-driven secret rotation patterns, matching current Key Vault documentation.
- The best-practices list implied Automation credentials can have secret expiration dates set like Key Vault secrets. Updated the wording so Key Vault secrets have expiration dates, while Automation credentials have documented rotation schedules.

## Review Notes
- The Key Vault example uses access policies with `az keyvault set-policy`, which is valid for vaults using the access policy permission model. For vaults using Azure RBAC authorization, equivalent role assignments such as Key Vault Secrets User would be required instead.
- `Get-AzKeyVaultSecret -AsPlainText`, `Connect-AzAccount -Identity`, `Get-AutomationPSCredential`, and `Get-AutomationVariable` usage matched current official documentation.
