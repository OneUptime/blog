# Validation Summary: How to Configure Azure NSG Rules for IPv6

## Status
validated

## Post Type
Guide

## Technologies Covered
- Azure Network Security Groups (NSGs)
- Azure Virtual Network dual-stack IPv4/IPv6 networking
- Azure CLI
- Terraform with the AzureRM provider
- IPv6 addressing and CIDR prefixes

## Sources Consulted
- Microsoft Learn, "Overview of IPv6 for Azure Virtual Network": https://learn.microsoft.com/en-us/azure/virtual-network/ip-services/ipv6-overview
- Microsoft Learn, "Azure network security groups overview": https://learn.microsoft.com/en-us/azure/virtual-network/network-security-groups-overview
- Microsoft Learn, "`az network nsg rule`": https://learn.microsoft.com/en-us/cli/azure/network/nsg/rule?view=azure-cli-latest
- Microsoft Learn, "`az network vnet subnet update`": https://learn.microsoft.com/en-us/cli/azure/network/vnet/subnet?view=azure-cli-latest
- Microsoft Learn, "Create an Azure virtual machine with a dual-stack network": https://learn.microsoft.com/en-us/azure/virtual-network/ip-services/create-vm-dual-stack-ipv6-portal
- Microsoft Learn, "Deploy IPv6 dual stack application": https://learn.microsoft.com/en-us/azure/load-balancer/deploy-ipv4-ipv6-dual-stack-standard-load-balancer
- Terraform Registry, "`azurerm_network_security_group`": https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/network_security_group
- Terraform Registry, "`azurerm_subnet_network_security_group_association`": https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/subnet_network_security_group_association
- RFC 3849, "IPv6 Address Prefix Reserved for Documentation": https://www.rfc-editor.org/rfc/rfc3849.html

## Issues Found
- The introduction and conclusion implied that IPv4 rules never cover IPv6 traffic. I changed this to distinguish IPv4-specific prefixes such as `0.0.0.0/0` from the wildcard `*`, because Azure documents `*` as matching all IPs.
- The Terraform IPv4 examples used `source_address_prefix = "*"`, which overlapped with the IPv6 rules and made the paired IPv4/IPv6 examples misleading. I changed the IPv4 rules to use `0.0.0.0/0` so they are actually IPv4-specific.
- The Azure CLI example used `2001:db8:admin::/48`, which is not a valid IPv6 prefix because `admin` is not a hexadecimal hextet. I replaced it with the valid documentation prefix `2001:db8:1234::/48`.
- The post recommended adding ICMPv6 NSG rules and included an `AllowICMPv6` Terraform rule. I removed that rule and corrected the explanation because Microsoft documents that ICMPv6 is not currently supported in Azure Network Security Groups.
- The default-rule notes used "ALB" and overgeneralized the rule descriptions. I corrected the wording to match Azure's documented inbound default rules more closely.

## Review Notes
- Azure CLI and Terraform binaries were not installed in the local workspace, so command and schema validation was performed against current Microsoft Learn and Terraform Registry documentation instead of local `--help` output.
- Microsoft also documents that IPv6 health probes in dual-stack load balancer configurations require an active NSG. The post does not cover that scenario, but the current content is technically correct after the fixes above.
