# Validation Summary: How to Create a Private DNS Zone and Link It to a Virtual Network in Azure

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Private DNS zones
- Azure Virtual Network links
- Azure DNS auto-registration
- Azure Private Endpoints
- Azure CLI
- Azure-provided DNS resolver

## Sources Consulted
- Microsoft Learn: Azure Private DNS zone overview, https://learn.microsoft.com/en-us/azure/dns/private-dns-privatednszone
- Microsoft Learn: What is a virtual network link subresource of Azure DNS private zones, https://learn.microsoft.com/en-us/azure/dns/private-dns-virtual-network-links
- Microsoft Learn: What is autoregistration feature in Azure DNS private zones, https://learn.microsoft.com/en-us/azure/dns/private-dns-autoregistration
- Microsoft Learn: Quickstart - Create an Azure private DNS zone using the Azure CLI, https://learn.microsoft.com/en-us/azure/dns/private-dns-getstarted-cli
- Microsoft Learn Azure CLI reference: az network private-dns link vnet, https://learn.microsoft.com/en-us/cli/azure/network/private-dns/link/vnet
- Microsoft Learn Azure CLI reference: az network private-dns record-set a, https://learn.microsoft.com/en-us/cli/azure/network/private-dns/record-set/a
- Microsoft Learn Azure CLI reference: az network private-dns record-set cname, https://learn.microsoft.com/en-us/cli/azure/network/private-dns/record-set/cname
- Microsoft Learn: Azure Private Endpoint private DNS zone values, https://learn.microsoft.com/en-us/azure/private-link/private-endpoint-dns

## Issues Found
- The post said that only one virtual network link in a private DNS zone can have auto-registration enabled. Microsoft documentation states that a private DNS zone can have multiple registration virtual networks, while each individual VNet can have only one registration zone. Updated the wording to reflect the per-VNet limit.
- The post said private endpoints require private DNS zones for name resolution. Private DNS zones are the recommended Azure-integrated approach, but private endpoints can also be resolved with equivalent custom DNS records. Updated the wording to avoid implying Private DNS is the only possible configuration.
- The post said Azure can automatically add the DNS record after creating a storage account private endpoint. Updated the wording to clarify that automatic record creation depends on associating the private endpoint with the private DNS zone.

## Review Notes
The Azure CLI commands and flags used in the post match the current Microsoft Azure CLI reference. The DNS resolution flow is correct for VNets using Azure-provided DNS. For Private Link zones, Microsoft also documents a newer virtual network link resolution policy, NxDomainRedirect, for public fallback after NXDOMAIN responses; that nuance is not required for this basic tutorial but may be worth covering in a future advanced article.
