# Validation Summary: How to Reduce Azure Data Transfer Costs with Private Endpoints

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- Azure Private Link
- Azure Private Endpoints
- Azure Virtual Network Service Endpoints
- Azure Storage networking
- Azure SQL Database networking
- Azure Private DNS
- Azure CLI
- Azure bandwidth and Private Link pricing

## Sources Consulted
- Azure virtual network service endpoints overview: https://learn.microsoft.com/en-us/azure/virtual-network/virtual-network-service-endpoints-overview
- What is a private endpoint?: https://learn.microsoft.com/en-us/azure/private-link/private-endpoint-overview
- Azure Private Endpoint private DNS zone values: https://learn.microsoft.com/en-us/azure/private-link/private-endpoint-dns
- Use private endpoints for Azure Storage: https://learn.microsoft.com/en-us/azure/storage/common/storage-private-endpoints
- Azure Private Link pricing: https://azure.microsoft.com/en-us/pricing/details/private-link/
- Azure bandwidth pricing: https://azure.microsoft.com/en-us/pricing/details/bandwidth/
- Azure CLI `az network private-endpoint`: https://learn.microsoft.com/en-us/cli/azure/network/private-endpoint
- Azure CLI `az network private-endpoint dns-zone-group`: https://learn.microsoft.com/en-us/cli/azure/network/private-endpoint/dns-zone-group
- Azure CLI `az network vnet subnet`: https://learn.microsoft.com/en-us/cli/azure/network/vnet/subnet
- Azure CLI `az network private-dns`: https://learn.microsoft.com/en-us/cli/azure/network/private-dns
- Azure CLI `az storage account network-rule`: https://learn.microsoft.com/en-us/cli/azure/storage/account/network-rule
- Azure CLI `az storage account`: https://learn.microsoft.com/en-us/cli/azure/storage/account
- Azure CLI `az sql server`: https://learn.microsoft.com/en-us/cli/azure/sql/server

## Issues Found
- The post incorrectly implied that same-region VM-to-PaaS traffic using a public endpoint "technically goes out to the internet and back in" and can be charged as internet egress. Updated the explanation to clarify that same-region Azure service traffic has no additional data transfer cost, and that avoidable charges are more likely when traffic leaves Azure, crosses regions, or is forced through internet/on-premises routing.
- The cost example treated ordinary same-region public endpoint traffic as $0.087/GB internet egress. Updated the scenario to describe an avoidable egress path and added a caveat that if traffic already stays on Azure's direct path, Service Endpoints may not reduce bandwidth charges and Private Endpoints may add Private Link processing charges.
- The bandwidth pricing bullet omitted the current free allowance for internet egress. Updated it to note the first 100 GB/month is free before the next 10 TB tier in many North America and Europe regions.
- The Service Endpoints guidance said they are only appropriate when you do not need to block public internet access. Updated it because service endpoints plus service firewall virtual network rules can restrict public internet access, although they do not provide a private IP.
- The Private Endpoints section implied public access is blocked by default. Updated it to clarify that public access must be blocked with the service firewall or public network access settings.
- Replaced `--disable-private-endpoint-network-policies true` with `--private-endpoint-network-policies Disabled`, because current Azure CLI documentation marks the former as a flag that will be replaced by the latter.
- Updated the diagram and summary language so the "without endpoints" path is described as public endpoint access rather than necessarily public internet routing.

## Review Notes
Azure CLI was not installed in the local environment, so command validation was performed against current official Azure CLI documentation instead of local `az --help`. Private Link prices vary by region and currency, so the post's approximate endpoint and per-GB figures should be treated as examples and checked against the pricing page before use in production estimates.
