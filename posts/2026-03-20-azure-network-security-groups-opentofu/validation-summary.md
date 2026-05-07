# Validation Summary: How to Create Network Security Groups with OpenTofu on Azure

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu
- Azure Resource Manager (`azurerm`) provider
- Azure Network Security Groups (NSGs)
- Azure Load Balancer service tags and health probes
- HCL infrastructure as code

## Sources Consulted
- HashiCorp AzureRM provider docs for `azurerm_network_security_group`: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/network_security_group
- HashiCorp AzureRM provider source docs for `azurerm_network_security_group`: https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/network_security_group.html.markdown
- HashiCorp AzureRM provider docs for `azurerm_network_security_rule`: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/network_security_rule
- HashiCorp AzureRM provider source docs for `azurerm_network_security_rule`: https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/network_security_rule.html.markdown
- HashiCorp AzureRM provider docs for `azurerm_subnet_network_security_group_association`: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/subnet_network_security_group_association
- HashiCorp AzureRM provider source docs for `azurerm_subnet_network_security_group_association`: https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/subnet_network_security_group_association.html.markdown
- Azure Network Security Groups overview: https://learn.microsoft.com/en-us/azure/virtual-network/network-security-groups-overview
- How network security groups filter network traffic: https://learn.microsoft.com/en-us/azure/virtual-network/network-security-group-how-it-works
- Azure service tags overview: https://learn.microsoft.com/en-us/azure/virtual-network/service-tags-overview
- Azure Load Balancer algorithm: https://learn.microsoft.com/en-us/azure/load-balancer/concepts
- Azure Load Balancer health probes: https://learn.microsoft.com/en-us/azure/load-balancer/load-balancer-custom-probe-overview

## Issues Found
- The introduction said OpenTofu manages NSGs with both inline and separate rule styles. I changed this to clarify that you can use either approach, but not both on the same NSG, because the AzureRM provider documentation warns that mixing inline `security_rule` blocks with standalone `azurerm_network_security_rule` resources causes conflicts and overwrites.
- The standalone rule example described traffic as coming from `AzureLoadBalancer`. I changed the wording and rule name to make clear that `AzureLoadBalancer` is appropriate for Azure Load Balancer health probes in this example, while public load-balanced client traffic retains the original client source IP and should be matched with `Internet` or specific client CIDRs instead.

## Review Notes
- The HCL resource syntax and arguments used in the post are current and valid against the reviewed AzureRM provider documentation.
- The custom `deny-all-inbound` rule is valid, though Azure NSGs already include a default `DenyAllInbound` rule at lower priority.
