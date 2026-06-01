# Validation Summary: How to Configure Private Endpoints for Azure Storage Accounts

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Storage Accounts
- Azure Private Endpoint
- Azure Private Link
- Azure Private DNS Zones
- Azure CLI
- Azure PowerShell
- Terraform AzureRM Provider
- Azure Virtual Network subnet policies

## Sources Consulted
- Microsoft Learn: Use private endpoints for Azure Storage - https://learn.microsoft.com/azure/storage/common/storage-private-endpoints
- Microsoft Learn: Azure Private Endpoint overview - https://learn.microsoft.com/azure/private-link/private-endpoint-overview
- Microsoft Learn: Azure Private Endpoint private DNS zone values - https://learn.microsoft.com/azure/private-link/private-endpoint-dns
- Microsoft Learn: az network private-endpoint - https://learn.microsoft.com/cli/azure/network/private-endpoint
- Microsoft Learn: az network private-endpoint dns-zone-group - https://learn.microsoft.com/cli/azure/network/private-endpoint/dns-zone-group
- Microsoft Learn: az storage account - https://learn.microsoft.com/cli/azure/storage/account
- Microsoft Learn: Manage network policies for private endpoints - https://learn.microsoft.com/azure/private-link/disable-private-endpoint-network-policy
- Microsoft Learn: Create a private endpoint with Azure PowerShell - https://learn.microsoft.com/azure/private-link/create-private-endpoint-powershell
- Microsoft Learn: New-AzPrivateDnsZoneGroup - https://learn.microsoft.com/powershell/module/az.network/new-azprivatednszonegroup
- HashiCorp Terraform Registry: azurerm_private_endpoint - https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/private_endpoint

## Issues Found
- The post omitted the `web` storage subresource from the introductory storage service list and the private DNS zone list, even though the CLI group ID list included `web` and `web_secondary`. Added Web/Static Website references and the `privatelink.web.core.windows.net` DNS zone.
- The Data Lake Storage Gen2 example did not mention that Microsoft recommends creating both DFS and Blob private endpoints because some operations depend on both endpoints. Added a short note after the DFS private endpoint example.
- The PowerShell example created the private DNS zone and VNet link but did not create a private DNS zone group, so it would not auto-register the private endpoint IP as described. Added `New-AzPrivateDnsZoneConfig` and `New-AzPrivateDnsZoneGroup`.
- The subnet requirements section described private endpoint network policies as something that should always be disabled and had a command comment saying the subnet "allows" policies while the command disabled them. Updated the wording to match current Azure guidance: policies are disabled by default, can be enabled for NSG/UDR support, and the shown command disables them.

## Review Notes
The Azure CLI, storage public network access, private DNS zone group, PowerShell private endpoint, and Terraform AzureRM examples are consistent with current official documentation after the corrections above. The connectivity test using `curl` may return an authentication-related status code, but it is still a reasonable low-level connectivity check when paired with DNS validation.
