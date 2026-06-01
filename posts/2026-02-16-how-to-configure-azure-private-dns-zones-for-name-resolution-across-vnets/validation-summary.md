# Validation Summary: How to Configure Azure Private DNS Zones for Name Resolution Across VNets

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Private DNS Zones
- Azure Virtual Network DNS resolution
- Azure Private Endpoint DNS integration
- Azure DNS Private Resolver
- Azure CLI
- Hub-spoke networking

## Sources Consulted
- Azure Private DNS zone overview: https://learn.microsoft.com/en-us/azure/dns/private-dns-privatednszone
- Azure Private DNS virtual network links: https://learn.microsoft.com/en-us/azure/dns/private-dns-virtual-network-links
- Azure Private DNS autoregistration: https://learn.microsoft.com/en-us/azure/dns/private-dns-autoregistration
- Azure Private Endpoint private DNS zone values: https://learn.microsoft.com/en-us/azure/private-link/private-endpoint-dns
- Azure DNS Private Resolver architecture guidance: https://learn.microsoft.com/en-us/azure/dns/private-resolver-architecture
- Azure Virtual Network name resolution guide: https://learn.microsoft.com/en-us/azure/virtual-network/virtual-networks-name-resolution-for-vms-and-role-instances
- Azure CLI reference for private DNS virtual network links: https://learn.microsoft.com/en-us/cli/azure/network/private-dns/link/vnet
- Azure CLI reference for private DNS A records: https://learn.microsoft.com/en-us/cli/azure/network/private-dns/record-set/a
- Azure CLI reference for DNS resolver: https://learn.microsoft.com/en-us/cli/azure/dns-resolver
- Azure CLI reference for DNS resolver inbound endpoints: https://learn.microsoft.com/en-us/cli/azure/dns-resolver/inbound-endpoint
- Azure Monitor private link configuration: https://learn.microsoft.com/en-us/azure/azure-monitor/fundamentals/private-link-configure

## Issues Found
- The DNS resolution flow implied that every VM query starts with Azure DNS even when custom DNS is configured. Updated the text to clarify that this flow applies when the VNet uses default Azure DNS settings, and that custom DNS servers must forward private zone queries to Azure DNS or Azure DNS Private Resolver.
- The Azure Monitor private endpoint DNS entry listed only `privatelink.monitor.azure.com`. Updated the table to include the additional Azure Monitor private DNS zones documented by Microsoft for Azure Monitor Private Link Scope.
- The DNS verification example listed only `10.x.x.x` and `172.x.x.x` as private IP examples. Updated it to describe private IPs from the VNet address space and include `192.168.x.x`.

## Review Notes
Azure CLI command syntax was checked against current Microsoft Learn CLI references. The local environment does not have the Azure CLI installed, so commands could not be executed locally.
