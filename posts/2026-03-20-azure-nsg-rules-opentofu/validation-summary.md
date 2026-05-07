# Validation Summary: How to Configure Azure Network Security Group Rules with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu
- Azure Network Security Groups (NSGs)
- Azure Virtual Network
- Azure subnets
- HashiCorp AzureRM provider

## Sources Consulted
- Azure network security groups overview: https://learn.microsoft.com/en-us/azure/virtual-network/network-security-groups-overview
- How network security groups filter network traffic: https://learn.microsoft.com/en-us/azure/virtual-network/network-security-group-how-it-works
- OpenTofu `for_each` meta-argument: https://opentofu.org/docs/v1.11/language/meta-arguments/for_each/
- OpenTofu `plan` command: https://opentofu.org/docs/cli/commands/plan/
- AzureRM `azurerm_network_security_group`: https://github.com/hashicorp/terraform-provider-azurerm/blob/main/website/docs/r/network_security_group.html.markdown
- AzureRM `azurerm_network_security_rule`: https://github.com/hashicorp/terraform-provider-azurerm/blob/main/website/docs/r/network_security_rule.html.markdown
- AzureRM `azurerm_subnet_network_security_group_association`: https://github.com/hashicorp/terraform-provider-azurerm/blob/main/website/docs/r/subnet_network_security_group_association.html.markdown

## Issues Found
- The description said NSGs control traffic for "Azure virtual networks and subnets," which overstates where NSGs attach. I changed it to refer to resources in Azure virtual networks, matching Azure's documentation that NSGs are associated with subnets and network interfaces rather than directly with a virtual network.
- The summary said OpenTofu "ensures no manual portal changes go untracked." I changed this to say it helps surface drift during `plan` and `apply`, which is the documented OpenTofu behavior when it refreshes remote object state.

## Review Notes
- The HCL resource syntax, argument names, priorities, service-tag usage, and `for_each` pattern are technically valid as written.
- The custom `deny-all-inbound` rule is valid, but Azure already includes a default `DenyAllInbound` rule at priority `65500`, so the example's explicit deny rule is redundant rather than required.
- The AzureRM provider docs still warn not to mix inline `security_rule` blocks and standalone `azurerm_network_security_rule` resources on the same NSG. This post avoids that conflict by using separate NSGs for the two approaches.
- The examples assume supporting resources such as the resource group and subnets already exist.
