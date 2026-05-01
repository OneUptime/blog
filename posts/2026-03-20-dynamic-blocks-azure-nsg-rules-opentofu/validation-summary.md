# Validation Summary: How to Use Dynamic Blocks for Azure NSG Rules in OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- HCL
- Azure Network Security Groups (NSGs)
- AzureRM provider

## Sources Consulted
- OpenTofu `dynamic` blocks documentation: https://opentofu.org/docs/language/expressions/dynamic-blocks/
- AzureRM provider `azurerm_network_security_group` documentation source: https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/network_security_group.html.markdown
- AzureRM provider `azurerm_network_security_rule` documentation source: https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/network_security_rule.html.markdown
- Microsoft Learn, Azure network security groups overview: https://learn.microsoft.com/en-us/azure/virtual-network/network-security-groups-overview
- Microsoft Learn, Create, change, or delete a network security group: https://learn.microsoft.com/en-us/azure/virtual-network/manage-network-security-group?tabs=network-security-group-portal

## Issues Found
- The inline comment for `protocol` in the `nsg_security_rules` variable listed an incomplete set of current AzureRM-supported protocol values. I updated it from `Tcp, Udp, Icmp, *` to `Tcp, Udp, Icmp, Esp, Ah, *` to match the provider documentation.

## Review Notes
- The dynamic block usage is technically correct for OpenTofu. `dynamic` blocks can generate repeatable nested blocks inside resources, and iterating over a list of objects is valid.
- The `security_rule` arguments and example values align with the current AzureRM provider schema, including `direction`, `access`, service tags such as `Internet` and `VirtualNetwork`, and the custom rule priority range of `100` to `4096`.
- The examples use inline `security_rule` blocks inside `azurerm_network_security_group`. This is valid, but these inline rules should not be mixed with separate `azurerm_network_security_rule` resources for the same NSG.
- The snippets assume surrounding provider configuration and supporting variables such as `location`, `resource_group_name`, and `tags` are defined elsewhere in the OpenTofu configuration.
