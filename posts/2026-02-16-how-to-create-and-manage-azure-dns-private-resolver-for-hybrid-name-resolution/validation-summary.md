# Validation Summary: How to Create and Manage Azure DNS Private Resolver for Hybrid Name Resolution

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure DNS Private Resolver
- Azure Private DNS zones
- Azure Private Link private endpoint DNS
- Azure CLI dns-resolver extension
- DNS conditional forwarding
- BIND DNS configuration

## Sources Consulted
- Microsoft Learn: Azure DNS Private Resolver overview, https://learn.microsoft.com/en-us/azure/dns/dns-private-resolver-overview
- Microsoft Learn: Azure DNS Private Resolver architecture, https://learn.microsoft.com/en-us/azure/architecture/networking/architecture/azure-dns-private-resolver
- Microsoft Learn: Azure Private Endpoint DNS integration scenarios, https://learn.microsoft.com/en-us/azure/private-link/private-endpoint-dns-integration
- Microsoft Learn: Azure Private Endpoint private DNS zone values, https://learn.microsoft.com/en-us/azure/private-link/private-endpoint-dns
- Microsoft Learn: Azure CLI az dns-resolver, https://learn.microsoft.com/en-us/cli/azure/dns-resolver
- Microsoft Learn: Azure CLI az dns-resolver inbound-endpoint, https://learn.microsoft.com/en-us/cli/azure/dns-resolver/inbound-endpoint
- Microsoft Learn: Azure CLI az dns-resolver outbound-endpoint, https://learn.microsoft.com/en-us/cli/azure/dns-resolver/outbound-endpoint
- Microsoft Learn: Azure CLI az dns-resolver forwarding-ruleset, https://learn.microsoft.com/en-us/cli/azure/dns-resolver/forwarding-ruleset
- Microsoft Learn: Azure CLI az dns-resolver forwarding-rule, https://learn.microsoft.com/en-us/cli/azure/dns-resolver/forwarding-rule
- Microsoft Learn: Azure CLI az dns-resolver vnet-link, https://learn.microsoft.com/en-us/cli/azure/dns-resolver/vnet-link
- Microsoft Azure: Azure DNS pricing, https://azure.microsoft.com/pricing/details/dns/

## Issues Found
- The prerequisites said each resolver subnet needs at least a /28 address range. Azure DNS Private Resolver subnets must be between /28 and /24, so the wording was corrected to include the maximum supported size.
- The on-premises DNS examples forwarded Private Endpoint queries directly to `privatelink.*` zones. Microsoft guidance for Private Endpoint name resolution from on-premises recommends conditional forwarding to the public DNS zone forwarders, such as `database.windows.net` instead of `privatelink.database.windows.net`, so the examples were updated.
- The test command used `mysqlserver.privatelink.database.windows.net`, which mixed a MySQL-like host name with the Azure SQL Database private DNS zone. It was changed to `sqlserver.database.windows.net` to match Azure SQL Private Endpoint resolution through the public zone forwarder.
- The pricing section used stale hard-coded endpoint pricing and omitted ruleset charges. It now describes the current billing dimensions and directs readers to the Azure DNS pricing page for current region and currency rates.

## Review Notes
The Azure CLI command groups, required parameters, forwarding rule syntax, VNet link command, endpoint subnet delegation, and inbound/outbound resolver behavior were checked against current Microsoft documentation and found to be valid after the fixes above.
