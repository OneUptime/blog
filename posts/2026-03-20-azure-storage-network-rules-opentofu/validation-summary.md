# Validation Summary: How to Configure Azure Storage Network Rules with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Storage accounts
- Azure Storage firewall and virtual network rules
- Azure Private Endpoint / Private Link
- Azure Private DNS
- OpenTofu / HCL
- HashiCorp AzureRM provider

## Sources Consulted
- Azure Storage firewall rules: https://learn.microsoft.com/en-us/azure/storage/common/storage-network-security
- Set the default public network access rule for an Azure Storage account: https://learn.microsoft.com/en-us/azure/storage/common/storage-network-security-set-default-access
- Use private endpoints for Azure Storage: https://learn.microsoft.com/en-us/azure/storage/common/storage-private-endpoints
- Azure Private Endpoint private DNS zone values: https://learn.microsoft.com/en-us/azure/private-link/private-endpoint-dns
- AzureRM `azurerm_storage_account` resource documentation: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/storage_account
- AzureRM `azurerm_storage_account_network_rules` resource documentation: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/storage_account_network_rules
- AzureRM `azurerm_private_endpoint` resource documentation: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/private_endpoint
- AzureRM `azurerm_storage_account` data source documentation: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/storage_account
- AzureRM `azurerm_subnet` resource documentation: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/subnet

## Issues Found
1. **Network rules scope was overstated**: The overview and inline comment implied `network_rules` controls all storage traffic. Azure documents these rules as applying to the storage account's public endpoint. I corrected the wording to say public endpoint explicitly.
2. **Private endpoint section implied public access was disabled automatically**: The post said a private endpoint would disable public access entirely. Azure documents that creating a private endpoint does not automatically block the public endpoint. I corrected the wording to explain that `public_network_access_enabled = false` must also be set if the goal is to remove the public endpoint entirely.
3. **Private DNS integration was incomplete**: The private endpoint example created a private DNS zone and VNet link, but it did not associate the private endpoint with that zone. I added the `private_dns_zone_group` block so the private DNS zone is attached to the private endpoint as required by the AzureRM provider pattern.
4. **Standalone network-rules example conflicted with the inline pattern used earlier**: The post used inline `network_rules` on `azurerm_storage_account` in Step 2, then later used `azurerm_storage_account_network_rules` against the same logical account. AzureRM provider docs state these two approaches must not be used together for the same storage account. I changed Step 4 to target an existing storage account via a data source and added a note warning against mixing the two management patterns.

## Review Notes
- The `Microsoft.Storage` service endpoint on the subnet is correct for the same-region virtual network rule example.
- Azure documents that private endpoints can coexist in subnets that use service endpoints, so reusing the subnet in the example is technically valid.
- If readers apply the private-endpoint pattern to Azure Data Lake Storage Gen2, Azure recommends creating both `blob` and `dfs` private endpoints because some DFS operations depend on the Blob endpoint.
