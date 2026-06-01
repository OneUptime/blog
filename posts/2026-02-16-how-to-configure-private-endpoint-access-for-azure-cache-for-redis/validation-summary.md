# Validation Summary: How to Configure Private Endpoint Access for Azure Cache for Redis

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Azure Cache for Redis
- Azure Managed Redis
- Azure Private Link
- Azure Private Endpoint
- Azure Virtual Network
- Azure Private DNS
- Azure CLI
- Redis CLI
- Azure App Service VNet Integration
- ExpressRoute and VPN connectivity

## Sources Consulted
- Microsoft Learn: Azure Cache for Redis with Azure Private Link - https://learn.microsoft.com/en-us/azure/azure-cache-for-redis/cache-private-link
- Microsoft Learn: Azure Private Endpoint private DNS zone values - https://learn.microsoft.com/en-us/azure/private-link/private-endpoint-dns
- Microsoft Learn: Azure CLI `az redis` reference - https://learn.microsoft.com/en-us/cli/azure/redis
- Microsoft Learn: Azure CLI `az network private-endpoint` reference - https://learn.microsoft.com/en-us/cli/azure/network/private-endpoint
- Microsoft Learn: Azure CLI `az network private-endpoint dns-zone-group` reference - https://learn.microsoft.com/en-us/cli/azure/network/private-endpoint/dns-zone-group
- Microsoft Learn: Azure CLI `az network private-dns link vnet` reference - https://learn.microsoft.com/en-us/cli/azure/network/private-dns/link/vnet
- Microsoft Learn: Azure CLI `az network vnet subnet` reference - https://learn.microsoft.com/en-us/cli/azure/network/vnet/subnet
- Microsoft Learn: Enable virtual network integration in Azure App Service - https://learn.microsoft.com/en-us/azure/app-service/configure-vnet-integration-enable

## Issues Found
- The post said private endpoints worked on Standard and Premium tiers only. Current Microsoft documentation states private endpoint support includes Basic, Standard, Premium, Enterprise, and Azure Managed Redis. Updated the tier descriptions and added the documented Basic-tier data-loss caveat when deleting and recreating private endpoints.
- The `az redis create` example used `--vm-size C1` and `--enable-non-ssl-port false`. The Azure CLI reference lists Redis VM sizes as lowercase values such as `c1`, and `--enable-non-ssl-port` is a flag that enables port 6379 when specified. Updated the command to use `--vm-size c1` and removed the flag, then clarified that the non-SSL port stays disabled unless explicitly enabled.
- The private endpoint command used `--group-id redisCache`. Current Azure CLI documentation accepts `--group-id` and `--group-ids`, but Microsoft Azure Cache for Redis examples use `--group-ids redisCache`. Updated the command and explanatory text to match the Redis private endpoint documentation.
- The post implied that creating a private endpoint always leaves public access enabled. Current Azure Cache for Redis documentation states the `publicNetworkAccess` flag is `Disabled` by default when using private endpoints, while still allowing it to be explicitly set. Updated Step 5 to instruct readers to verify or explicitly disable the flag if needed.
- The introduction and diagram implied that a private endpoint alone removes or blocks public access. Updated both to clarify that public access is blocked after public network access is disabled.
- The timeout troubleshooting section told readers to check NSG rules on the private endpoint subnet after the guide had disabled private endpoint network policies. Updated the note to distinguish between subnets with private endpoint network policies enabled and disabled.

## Review Notes
Azure Cache for Redis now has an announced retirement timeline, and Microsoft recommends moving to Azure Managed Redis. The post remains technically relevant because the documented private endpoint pattern still applies, but a future content update should consider whether the article should be retitled or expanded for Azure Managed Redis.
