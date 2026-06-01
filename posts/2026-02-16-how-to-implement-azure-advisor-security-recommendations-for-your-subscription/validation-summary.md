# Validation Summary: How to Implement Azure Advisor Security Recommendations for Your Subscription

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Azure Advisor
- Microsoft Defender for Cloud
- Microsoft Entra Conditional Access
- Azure CLI
- Azure Monitor diagnostic settings
- Azure Storage networking and encryption
- Microsoft Defender for SQL
- Network security groups
- Just-in-time VM access
- Azure Policy and remediation tasks

## Sources Consulted
- Microsoft Defender for Cloud security recommendations: https://learn.microsoft.com/en-us/azure/defender-for-cloud/security-recommendations
- Microsoft Defender for Cloud secure score: https://learn.microsoft.com/en-us/azure/defender-for-cloud/secure-score-security-controls
- Azure CLI diagnostic settings reference: https://learn.microsoft.com/en-us/cli/azure/monitor/diagnostic-settings?view=azure-cli-latest
- Azure CLI storage account reference: https://learn.microsoft.com/en-us/cli/azure/storage/account?view=azure-cli-latest
- Azure CLI storage account network-rule reference: https://learn.microsoft.com/en-us/cli/azure/storage/account/network-rule?view=azure-cli-latest
- Azure CLI SQL advanced threat protection reference: https://learn.microsoft.com/en-us/cli/azure/sql/server/advanced-threat-protection-setting?view=azure-cli-latest
- Microsoft Defender for SQL documentation: https://learn.microsoft.com/en-us/azure/azure-sql/database/azure-defender-for-sql?view=azuresql
- Azure CLI security pricing reference: https://learn.microsoft.com/en-us/cli/azure/security/pricing?view=azure-cli-latest
- Azure CLI NSG rule reference: https://learn.microsoft.com/en-us/cli/azure/network/nsg/rule?view=azure-cli-latest
- Microsoft Defender for Cloud JIT VM access documentation: https://learn.microsoft.com/en-us/azure/defender-for-cloud/just-in-time-access-usage
- Defender for Cloud JIT network access policy REST API: https://learn.microsoft.com/en-us/rest/api/defenderforcloud/jit-network-access-policies/initiate?view=rest-defenderforcloud-2020-01-01
- Azure CLI secure scores reference: https://learn.microsoft.com/en-us/cli/azure/security/secure-scores?view=azure-cli-latest
- Azure Policy assignment quickstart: https://learn.microsoft.com/en-us/azure/governance/policy/assign-policy-azurecli
- Azure CLI policy remediation reference: https://learn.microsoft.com/en-us/cli/azure/policy/remediation?view=azure-cli-latest
- Azure Storage regulatory compliance policy mappings: https://learn.microsoft.com/en-us/azure/storage/common/security-controls-policy

## Issues Found
- Updated Azure AD terminology and portal path to Microsoft Entra ID and the current Conditional Access location.
- Corrected the MFA instructions so they target users or groups with Azure RBAC Owner assignments and the Microsoft Azure Management target resource, instead of selecting Entra directory roles such as Global Administrator as a proxy for subscription Owner.
- Clarified the storage networking command comment because `--default-action Deny` restricts public endpoint access to selected networks; it does not disable public network access entirely.
- Renamed Azure Defender for SQL to Microsoft Defender for SQL and added the `az security pricing create --name SqlServers --tier Standard` command to enable the subscription Defender plan.
- Fixed the SQL Advanced Threat Protection command to use `--name` for the server name, matching the Azure CLI reference.
- Replaced the invalid `az security jit-policy initiate` command with an `az rest` call to the documented JIT network access policy initiate REST endpoint.
- Replaced a hard-coded and unverified Azure Policy definition ID with a lookup by the built-in policy display name.
- Made the policy remediation command generic because only policies with remediation-capable effects such as deployIfNotExists or modify can be remediated automatically.
- Corrected `az security secure-score list` to the current Azure CLI command group `az security secure-scores list`.

## Review Notes
Azure CLI was not installed in the local environment, so command validation was performed against Microsoft Learn CLI references and Defender for Cloud REST documentation rather than local `az --help` output.
