# Validation Summary: How to Configure Azure Private Endpoint DNS Zones

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Private Endpoint
- Azure Private DNS Zones
- Azure DNS Private Resolver
- Azure CLI
- Windows DNS Server conditional forwarders
- BIND DNS forwarding
- Hybrid DNS resolution over VPN or ExpressRoute

## Sources Consulted
- Microsoft Learn: Azure Private Endpoint private DNS zone values - https://learn.microsoft.com/en-us/azure/private-link/private-endpoint-dns
- Microsoft Learn: Azure Private Endpoint DNS integration scenarios - https://learn.microsoft.com/en-us/azure/private-link/private-endpoint-dns-integration
- Microsoft Learn: Azure Private DNS zone overview - https://learn.microsoft.com/en-us/azure/dns/private-dns-privatednszone
- Microsoft Learn: Azure DNS Private Resolver endpoints and rulesets - https://learn.microsoft.com/en-us/azure/dns/private-resolver-endpoints-rulesets
- Microsoft Learn: az dns-resolver CLI reference - https://learn.microsoft.com/en-us/cli/azure/dns-resolver
- Microsoft Learn: az dns-resolver inbound-endpoint CLI reference - https://learn.microsoft.com/en-us/cli/azure/dns-resolver/inbound-endpoint
- Microsoft Learn: az dns-resolver outbound-endpoint CLI reference - https://learn.microsoft.com/en-us/cli/azure/dns-resolver/outbound-endpoint
- Microsoft Learn: az dns-resolver forwarding-ruleset CLI reference - https://learn.microsoft.com/en-us/cli/azure/dns-resolver/forwarding-ruleset
- Microsoft Learn: az dns-resolver forwarding-rule CLI reference - https://learn.microsoft.com/en-us/cli/azure/dns-resolver/forwarding-rule
- Microsoft Learn: az dns-resolver vnet-link CLI reference - https://learn.microsoft.com/en-us/cli/azure/dns-resolver/vnet-link
- Microsoft Learn: az network private-endpoint dns-zone-group CLI reference - https://learn.microsoft.com/en-us/cli/azure/network/private-endpoint/dns-zone-group
- Microsoft Learn: az network private-dns zone CLI reference - https://learn.microsoft.com/en-us/cli/azure/network/private-dns/zone

## Issues Found
- The on-premises DNS forwarding examples used `privatelink.*` zones as conditional forwarder zones. Microsoft documentation recommends forwarding the public service zones, such as `blob.core.windows.net` or `database.windows.net`, to Azure DNS Private Resolver so the resolver can follow the public CNAME and resolve the linked Private DNS zone. Updated the Windows DNS and BIND examples and the surrounding explanation.
- The Azure DNS Private Resolver inbound endpoint example used an inline JSON shape that did not match the documented Azure CLI shorthand for `--ip-configurations`. Updated it to the current documented shorthand with `private-ip-address`, `private-ip-allocation-method`, and `id`.
- The outbound forwarding example created a forwarding ruleset and rule, but did not link the ruleset to a VNet. Azure workloads only use forwarding rules from a ruleset linked to their VNet. Added an `az dns-resolver vnet-link create` command.
- The forwarding rule example used `ipAddress` in `--target-dns-servers`; the Azure CLI documentation shows `ip-address` for this shorthand argument. Updated the example.
- The text said Step 4 created both inbound and outbound endpoints, but the code only created the inbound endpoint. Updated the wording to match the example.

## Review Notes
The post is technically relevant and contains implementation guidance. Azure CLI was not installed in the local environment, so command verification was performed against current Microsoft Learn CLI reference pages rather than local `az --help` output.
