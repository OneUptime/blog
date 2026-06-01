# Validation Summary: How to Restrict Azure Storage Account Access Using Private Endpoints

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Azure Storage Accounts
- Azure Private Endpoint
- Azure Private Link
- Azure Private DNS Zones
- Azure Virtual Network service endpoints
- Azure CLI
- Azure Monitor metrics
- Azure Monitor diagnostic settings
- Log Analytics

## Sources Consulted
- Microsoft Learn: Use private endpoints for Azure Storage - https://learn.microsoft.com/en-us/azure/storage/common/storage-private-endpoints
- Microsoft Learn: Azure Private Endpoint private DNS zone values - https://learn.microsoft.com/en-us/azure/private-link/private-endpoint-dns
- Microsoft Learn: Azure Storage firewall rules - https://learn.microsoft.com/en-us/azure/storage/common/storage-network-security
- Microsoft Learn: Azure CLI `az network private-endpoint` - https://learn.microsoft.com/en-us/cli/azure/network/private-endpoint
- Microsoft Learn: Azure CLI `az network private-endpoint dns-zone-group` - https://learn.microsoft.com/en-us/cli/azure/network/private-endpoint/dns-zone-group
- Microsoft Learn: Azure CLI `az storage account` - https://learn.microsoft.com/en-us/cli/azure/storage/account
- Microsoft Learn: Azure CLI `az storage account network-rule` - https://learn.microsoft.com/en-us/cli/azure/storage/account/network-rule
- Microsoft Learn: Azure CLI `az network vnet subnet` - https://learn.microsoft.com/en-us/cli/azure/network/vnet/subnet
- Microsoft Learn: Azure CLI `az monitor metrics` - https://learn.microsoft.com/en-us/cli/azure/monitor/metrics
- Microsoft Learn: Azure CLI `az monitor diagnostic-settings` - https://learn.microsoft.com/en-us/cli/azure/monitor/diagnostic-settings
- Microsoft Learn: Supported logs for Microsoft.Storage/storageAccounts/blobServices - https://learn.microsoft.com/en-us/azure/azure-monitor/reference/supported-logs/microsoft-storage-storageaccounts-blobservices-logs
- Microsoft Learn: Static website hosting in Azure Storage - https://learn.microsoft.com/en-us/azure/storage/blobs/storage-blob-static-website

## Issues Found
- Data Lake Gen2 endpoint coverage was incomplete. Microsoft documentation recommends using both `dfs` and `blob` private endpoints for Data Lake Gen2 scenarios because some operations use or redirect between those endpoints. Added a short note after the storage sub-resources table.
- The network rules fallback omitted the `Microsoft.Storage` service endpoint required for subnet-based Azure Storage virtual network rules. Added an `az network vnet subnet update --service-endpoints Microsoft.Storage` command before adding the storage network rule.
- The network rules fallback could be misleading after `--public-network-access Disabled`, because virtual network rules affect the public endpoint path and require public network access to be enabled for selected networks. Added `--public-network-access Enabled` to the alternative update command.
- The monitoring section said the Azure Monitor metrics command monitored private endpoint traffic specifically. The `Transactions` metric supports dimensions such as `Authentication`, but it does not by itself prove that traffic used a private endpoint. Reworded the section to say it monitors storage transactions.
- The logging paragraph referred to "storage analytics logging." Modern Azure guidance uses Azure Monitor diagnostic settings and resource logs for blob service diagnostics. Reworded it to "diagnostic logging."

## Review Notes
Azure CLI is not installed in the local environment, so CLI syntax was validated against current Microsoft Learn Azure CLI reference pages rather than local `az --help` output.
