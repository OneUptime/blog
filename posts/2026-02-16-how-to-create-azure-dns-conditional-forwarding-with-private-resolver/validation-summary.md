# Validation Summary: How to Create Azure DNS Conditional Forwarding with Private Resolver

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure DNS Private Resolver
- Azure DNS forwarding rulesets
- Azure CLI dns-resolver extension
- Azure Virtual Network DNS resolution
- Azure Monitor metrics
- Hybrid DNS over VPN or ExpressRoute

## Sources Consulted
- Azure DNS Private Resolver overview: https://learn.microsoft.com/en-us/azure/dns/dns-private-resolver-overview
- Azure DNS Private Resolver endpoints and rulesets: https://learn.microsoft.com/en-us/azure/dns/private-resolver-endpoints-rulesets
- Azure DNS Private Resolver architecture guidance: https://learn.microsoft.com/en-us/azure/architecture/networking/architecture/azure-dns-private-resolver
- Resiliency in Azure DNS Private Resolver: https://learn.microsoft.com/en-us/azure/dns/private-resolver-reliability
- Azure CLI reference for az dns-resolver: https://learn.microsoft.com/en-us/cli/azure/dns-resolver
- Azure CLI reference for az dns-resolver outbound-endpoint: https://learn.microsoft.com/en-us/cli/azure/dns-resolver/outbound-endpoint
- Azure CLI reference for az dns-resolver forwarding-ruleset: https://learn.microsoft.com/en-us/cli/azure/dns-resolver/forwarding-ruleset
- Azure CLI reference for az dns-resolver forwarding-rule: https://learn.microsoft.com/en-us/cli/azure/dns-resolver/forwarding-rule
- Azure CLI reference for az dns-resolver vnet-link: https://learn.microsoft.com/en-us/cli/azure/dns-resolver/vnet-link
- Azure Monitor supported metrics for Microsoft.Network/dnsResolvers: https://learn.microsoft.com/en-us/azure/azure-monitor/reference/supported-metrics/microsoft-network-dnsresolvers-metrics

## Issues Found
- Clarified that linked forwarding rulesets apply to VMs using Azure-provided DNS. Microsoft documentation states that if custom DNS servers are configured for the VNet, queries are forwarded to those custom DNS server IPs instead of following the Azure-provided DNS ruleset path.
- Corrected the monitoring section. Current Azure Monitor metrics for `Microsoft.Network/dnsResolvers` include Queries Per Second, Inbound Endpoint Count, and Outbound Endpoint Count. The post incorrectly listed response latency and failed-query error counts as Private Resolver metrics.

## Review Notes
- The Azure CLI commands match the current `az dns-resolver` extension command structure and parameters in Microsoft Learn. The local environment did not have Azure CLI installed, so validation used the official Azure CLI reference instead of local `az --help`.
- The post's claims about outbound endpoints, forwarding rulesets, longest suffix match behavior, dedicated resolver subnets, and 10,000 QPS per endpoint align with current Microsoft documentation.
