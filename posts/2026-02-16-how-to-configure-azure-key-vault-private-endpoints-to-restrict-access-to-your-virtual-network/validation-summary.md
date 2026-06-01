# Validation Summary: How to Configure Azure Key Vault Private Endpoints to Restrict Access to Your

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Key Vault
- Azure Private Link
- Azure Private Endpoints
- Azure Private DNS
- Azure Virtual Network
- Azure PowerShell
- Azure CLI

## Sources Consulted
- Microsoft Learn: Integrate Key Vault with Azure Private Link - https://learn.microsoft.com/en-us/azure/key-vault/general/private-link-service
- Microsoft Learn: Configure network security for Azure Key Vault - https://learn.microsoft.com/en-us/azure/key-vault/general/network-security
- Microsoft Learn: Azure Private Endpoint private DNS zone values - https://learn.microsoft.com/en-us/azure/private-link/private-endpoint-dns
- Microsoft Learn: Diagnose private links configuration issues on Azure Key Vault - https://learn.microsoft.com/en-us/azure/key-vault/general/private-link-diagnostics
- Microsoft Learn: Manage network policies for private endpoints - https://learn.microsoft.com/en-us/azure/private-link/disable-private-endpoint-network-policy
- Microsoft Learn: az network private-endpoint command reference - https://learn.microsoft.com/en-us/cli/azure/network/private-endpoint
- Microsoft Learn: New-AzPrivateEndpoint - https://learn.microsoft.com/en-us/powershell/module/az.network/new-azprivateendpoint
- Microsoft Learn: New-AzPrivateLinkServiceConnection - https://learn.microsoft.com/en-us/powershell/module/az.network/new-azprivatelinkserviceconnection
- Microsoft Learn: Update-AzKeyVaultNetworkRuleSet - https://learn.microsoft.com/en-us/powershell/module/az.keyvault/update-azkeyvaultnetworkruleset

## Issues Found
- Corrected the DNS behavior after public network access is disabled. Public DNS can still resolve a Key Vault name by design; disabling public access blocks data-plane access through the public endpoint rather than making the name resolve to nothing.
- Clarified that private DNS must be configured before the Key Vault public FQDN resolves to the private endpoint IP from inside the VNet.
- Updated the private endpoint network policy wording. Current Azure Private Link documentation says private endpoint network policies are disabled by default and can be enabled when NSG or route-table support is needed, so disabling them is not a universal requirement for private endpoints to work.
- Fixed a PowerShell syntax issue where an inline comment followed a line-continuation backtick in the `Update-AzKeyVaultNetworkRuleSet` example.
- Corrected the lockout recovery note to clarify that re-enabling public access is a management-plane operation requiring sufficient permissions, not necessarily access from an already allowed network.
- Clarified that the `AzureServices` bypass applies only to trusted Microsoft services and does not cover every Azure service or every scenario.

## Review Notes
Azure CLI and PowerShell were not installed in the local environment, so command verification was performed against current Microsoft Learn command references instead of local `--help` output. The Azure CLI private endpoint example uses supported parameters, including `--private-connection-resource-id`, `--group-id`, and `--connection-name`.
