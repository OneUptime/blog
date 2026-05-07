# Validation Summary: How to Configure Azure Firewall with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- Azure Firewall
- Azure Firewall Policy
- Azure Virtual Network and subnets
- Azure route tables / user-defined routes
- Terraform `azurerm` provider

## Sources Consulted
- Terraform Registry: `azurerm_firewall` - https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/firewall
- Terraform Registry: `azurerm_firewall_policy` - https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/firewall_policy
- Terraform Registry: `azurerm_firewall_policy_rule_collection_group` - https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/firewall_policy_rule_collection_group
- Terraform Registry: `azurerm_route_table` - https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/route_table
- Microsoft Learn: Azure Firewall DNS settings - https://learn.microsoft.com/en-us/azure/firewall/dns-settings
- Microsoft Learn: Azure Firewall DNS Proxy details - https://learn.microsoft.com/en-us/azure/firewall/dns-details
- Microsoft Learn: FQDN tags overview for Azure Firewall - https://learn.microsoft.com/en-us/azure/firewall/fqdn-tags
- Microsoft Learn: Tutorial: Deploy and configure Azure Firewall and policy using the Azure portal - https://learn.microsoft.com/en-us/azure/firewall/tutorial-firewall-deploy-portal-policy
- Microsoft Learn: Reliability in Azure Firewall - https://learn.microsoft.com/en-us/azure/reliability/reliability-firewall
- Microsoft Learn: Deploy and configure Azure Firewall Basic and policy using the Azure portal - https://learn.microsoft.com/en-us/azure/firewall/deploy-firewall-basic-portal-policy

## Issues Found
- The post said application-rule FQDN matching requires DNS proxy. Microsoft documents that DNS proxy is required for FQDN filtering in network rules, while HTTP/S application rules can use the host header or SNI directly. I corrected the comment and conclusion text.
- The firewall policy configured `servers = ["168.63.129.16"]` while describing Azure DNS. Azure Firewall already uses Azure DNS by default, and the provider field is documented for custom DNS servers. I removed the custom server line and kept DNS proxy enabled.
- The `allow-windows-update` example used a short hard-coded list of Windows Update hostnames, which is brittle and incomplete compared with Microsoft’s documented `WindowsUpdate` FQDN tag. I replaced the manual list with the documented tag.
- The `allow-azure-services` example used `AzureMonitor` as an FQDN tag, but Microsoft’s current Azure Firewall FQDN tag list does not include that tag. I replaced it with documented tags.
- The firewall SKU comment implied the same resource shape works for Basic, Standard, or Premium. Azure Firewall Basic requires `AzureFirewallManagementSubnet` and a management NIC/public IP. I clarified that inline comment.

## Review Notes
- The `zones = ["1", "2", "3"]` example is valid for availability-zone-supported regions, but current Azure guidance says new firewalls in such regions are zone-redundant by default. The explicit `zones` setting is not strictly required for zone redundancy.
- The route-table example correctly uses the firewall private IP as the `VirtualAppliance` next hop for spoke traffic.
