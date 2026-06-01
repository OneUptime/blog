# Validation Summary: How to Configure Azure Private Endpoint DNS Integration with On-Premises DNS

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Private Endpoint
- Azure Private Link
- Azure Private DNS Zones
- Azure DNS Private Resolver
- Azure CLI
- Windows DNS Server conditional forwarders
- BIND DNS forwarding configuration
- Hybrid networking with VPN or ExpressRoute

## Sources Consulted
- Microsoft Learn: Azure Private Endpoint DNS Integration Scenarios - https://learn.microsoft.com/en-us/azure/private-link/private-endpoint-dns-integration
- Microsoft Learn: Tutorial - Create a private endpoint DNS infrastructure with Azure Private Resolver for an on-premises workload - https://learn.microsoft.com/en-us/azure/private-link/tutorial-dns-on-premises-private-resolver
- Microsoft Learn: Azure Private Endpoint private DNS zone values - https://learn.microsoft.com/en-us/azure/private-link/private-endpoint-dns
- Microsoft Learn: Azure DNS Private Resolver overview - https://learn.microsoft.com/en-us/azure/dns/dns-private-resolver-overview
- Microsoft Learn: Azure CLI az dns-resolver reference - https://learn.microsoft.com/en-us/cli/azure/dns-resolver
- Microsoft Learn: Azure CLI az dns-resolver inbound-endpoint reference - https://learn.microsoft.com/en-us/cli/azure/dns-resolver/inbound-endpoint

## Issues Found
- The post instructed readers to configure on-premises conditional forwarders for `privatelink.*` private DNS zones. Microsoft guidance for Private Endpoint DNS integration with Azure Private Resolver says conditional forwarding should be made to the recommended public DNS zone forwarders, such as `database.windows.net` instead of `privatelink.database.windows.net`. Updated the architecture description, Windows DNS examples, BIND examples, common zone table, and wrap-up to use public DNS zone forwarders.
- The post implied that linking a private DNS zone alone automatically creates the private endpoint A record. Azure creates and manages the A record when the private endpoint is associated with the private DNS zone through private DNS zone integration, such as a DNS zone group. Updated the wording and added a short note after the private DNS zone link commands.
- The common DNS zones table listed only private DNS zones while saying readers needed conditional forwarders for those zones. Updated the table to include the matching public DNS zone forwarders and clarified API-specific and multi-zone cases such as Cosmos DB for NoSQL, Key Vault, and Azure Monitor.

## Review Notes
The Azure CLI commands match the current Microsoft Learn syntax for `az dns-resolver create`, `az dns-resolver inbound-endpoint create`, and Azure Private DNS zone/link creation. The local environment did not have Azure CLI installed, so command validation was performed against official Azure CLI documentation rather than local `az --help` output.
