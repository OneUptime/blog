# Validation Summary: Enable Microsoft Defender for Key Vault to Detect Unusual Secret Access Patterns

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Microsoft Defender for Cloud
- Microsoft Defender for Key Vault
- Azure Key Vault
- Azure CLI
- Azure Monitor action groups and diagnostic settings
- Azure Monitor Logs / KQL
- Azure PowerShell Az.KeyVault
- Azure RBAC
- Microsoft Sentinel

## Sources Consulted
- Microsoft Defender for Key Vault overview: https://learn.microsoft.com/en-us/azure/defender-for-cloud/defender-for-key-vault-introduction
- Protect your key vaults with the Defender for Key Vault plan: https://learn.microsoft.com/en-us/azure/defender-for-cloud/tutorial-enable-key-vault-plan
- Alerts for Azure Key Vault: https://learn.microsoft.com/en-us/azure/defender-for-cloud/alerts-azure-key-vault
- Azure CLI `az security pricing`: https://learn.microsoft.com/en-us/cli/azure/security/pricing
- Azure CLI `az security contact`: https://learn.microsoft.com/en-us/cli/azure/security/contact
- Azure CLI `az security alert`: https://learn.microsoft.com/en-us/cli/azure/security/alert
- Azure CLI `az monitor action-group`: https://learn.microsoft.com/en-us/cli/azure/monitor/action-group
- Azure CLI `az monitor diagnostic-settings`: https://learn.microsoft.com/en-us/cli/azure/monitor/diagnostic-settings
- Azure CLI `az keyvault`: https://learn.microsoft.com/en-us/cli/azure/keyvault
- Azure Key Vault logging: https://learn.microsoft.com/en-us/azure/key-vault/general/howto-logging
- Azure Monitor diagnostic settings: https://learn.microsoft.com/en-us/azure/azure-monitor/essentials/diagnostic-settings
- Azure PowerShell `Update-AzKeyVaultNetworkRuleSet`: https://learn.microsoft.com/en-us/powershell/module/az.keyvault/update-azkeyvaultnetworkruleset
- Azure RBAC change history in Activity Log: https://learn.microsoft.com/en-us/azure/role-based-access-control/change-history-report
- Microsoft Defender for Cloud pricing: https://azure.microsoft.com/en-us/pricing/details/defender-for-cloud/
- Defender for Cloud free trial: https://learn.microsoft.com/en-us/azure/defender-for-cloud/free-trial

## Issues Found
- The `az security contact create` example used outdated boolean-style options (`--alert-notifications on` and `--alerts-to-admins on`). Updated it to the current JSON-shaped `--alert-notifications` and `--notifications-by-role` parameters.
- The action group paragraph implied creating an action group alone routes Defender alerts. Clarified that the action group must be attached to alert processing rules or Sentinel automation rules.
- The alert type table included non-current or inaccurate alert IDs and severities, including high severity for Tor and suspicious IP access. Replaced the table with the current documented Defender for Key Vault alert IDs and severities.
- The `az security alert list` query used `alertType` and `timeGeneratedUtc`. Updated it to use the documented alert-style fields `alertName` and `detectedTimeUtc`.
- The automated response wording said the network rule update denied all public access. `DefaultAction Deny` restricts access to configured network rules rather than disabling public network access entirely, so the wording was corrected.
- The diagnostic settings command set retention policies while sending to Log Analytics. Removed the retention policy fields because retention for Log Analytics is controlled by the workspace/table configuration, not the diagnostic setting.
- The network hardening comment said "VNet access only" while the example also bypasses trusted Azure services. Updated the comment to "selected networks."
- The RBAC audit statement said Azure RBAC assignments are logged in the Entra ID audit log. Corrected this to Azure Activity Log.
- The cost section mixed Defender for Key Vault billing with Key Vault transaction pricing. Updated it to say Defender for Key Vault is billed per vault per month, separate from normal Key Vault transaction charges.
- The post claimed a specific 30-day Key Vault Defender learning period without a supporting current Microsoft Defender for Key Vault source. Reworded it to the more general baseline-based anomaly behavior documented for Defender alerts.

## Review Notes
The Azure CLI was not installed in the local workspace, so command validation was performed against current Microsoft Learn CLI reference pages rather than local `az --help` output.
