# Validation Summary: How to Configure Private Endpoints for IPv4 in Azure

## Status
validated

## Post Type
Tutorial / How-to Guide

## Technologies Covered
- Azure Private Endpoints / Azure Private Link
- Azure CLI (`az network private-endpoint`, `az network private-dns`, `az network private-endpoint-connection`, `az network vnet subnet`)
- Azure Storage (blob subresource)
- Azure SQL Database (sqlServer subresource)
- Azure Private DNS Zones (`privatelink.blob.core.windows.net`)
- Azure Virtual Networks (VNet) and subnets
- Network Security Groups (NSGs)
- DNS resolution and `nslookup`

## Sources Consulted
- Azure CLI reference for `az network private-endpoint`: https://learn.microsoft.com/en-us/cli/azure/network/private-endpoint
- Azure CLI reference for `az network private-endpoint dns-zone-group`: https://learn.microsoft.com/en-us/cli/azure/network/private-endpoint/dns-zone-group
- Azure CLI reference for `az network private-endpoint-connection`: https://learn.microsoft.com/en-us/cli/azure/network/private-endpoint-connection
- Azure CLI reference for `az network vnet subnet`: https://learn.microsoft.com/en-us/cli/azure/network/vnet/subnet
- Azure CLI reference for `az network private-dns zone` and `az network private-dns link vnet`: https://learn.microsoft.com/en-us/cli/azure/network/private-dns
- Microsoft Docs: Private Endpoint subresource / group ID list (https://learn.microsoft.com/en-us/azure/private-link/private-endpoint-overview#private-link-resource)
- Microsoft Docs: Azure services DNS zone configuration (https://learn.microsoft.com/en-us/azure/private-link/private-endpoint-dns)
- Microsoft Docs: Manage network policies for private endpoints (https://learn.microsoft.com/en-us/azure/private-link/disable-private-endpoint-network-policy)

## Issues Found
No technical issues found.

All Azure CLI commands, flags, and group IDs were verified against official documentation:
- `--group-id blob` is correct for Azure Storage blob private endpoints.
- `--group-id sqlServer` is correct for Azure SQL Database private endpoints.
- `privatelink.blob.core.windows.net` is the correct Microsoft-recommended Private DNS zone for blob endpoints in Azure public cloud.
- `--disable-private-endpoint-network-policies true` is a valid (legacy) form; `az network vnet subnet update` continues to accept it.
- The JMESPath query using backticks for string literals is valid Azure CLI / JMESPath syntax, and the surrounding single quotes correctly prevent shell command substitution.
- `az network private-endpoint-connection list --id <parent>` and `az network private-endpoint-connection approve --type Microsoft.Storage/storageAccounts` are valid usages.

## Review Notes
- The `--disable-private-endpoint-network-policies <bool>` parameter on `az network vnet subnet update` still works, but Microsoft's newer recommended parameter is `--private-endpoint-network-policies Disabled` (string), which also supports `NetworkSecurityGroupEnabled` and `RouteTableEnabled` values for more granular policy control. Worth noting in a future revision but not incorrect today.
- The post correctly states NSGs can restrict access to private endpoints; this capability went GA in 2022 and is now standard, no caveat needed.
- The illustrative `10.x.x.x` vs `52.x.x.x` distinction is a reasonable approximation — actual private endpoint IPs will be allocated from the chosen subnet's address space, and Azure public IPs span far more than 52.x.x.x — but the example serves its illustrative purpose.
- The `--zone-name blob` argument in the dns-zone-group create command is just a friendly identifier within the group, not the FQDN; usage is correct.
