# Validation Summary: How to Build a Hub-Spoke Network Topology in Azure Using Terraform Modules

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform
- HashiCorp AzureRM provider
- Azure Virtual Network
- Azure Virtual Network peering
- Azure Firewall
- Azure route tables and user-defined routes
- Azure VPN Gateway subnet conventions
- Azure Bastion subnet conventions

## Sources Consulted
- HashiCorp Terraform AzureRM `azurerm_subnet` resource documentation: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/subnet
- HashiCorp Terraform AzureRM `azurerm_route_table` resource documentation: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/route_table
- HashiCorp Terraform AzureRM `azurerm_virtual_network_peering` resource documentation: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/virtual_network_peering
- HashiCorp Terraform AzureRM `azurerm_firewall` resource documentation: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/firewall
- HashiCorp Terraform `cidrsubnet` function documentation: https://developer.hashicorp.com/terraform/language/functions/cidrsubnet
- Microsoft Learn Azure Firewall FAQ: https://learn.microsoft.com/en-us/azure/firewall/firewall-faq
- Microsoft Learn Azure Firewall rule processing and default deny behavior: https://learn.microsoft.com/en-us/azure/firewall/rule-processing
- Microsoft Learn Azure Virtual Network peering overview: https://learn.microsoft.com/en-us/azure/virtual-network/virtual-network-peering-overview
- Microsoft Learn Azure Architecture Center spoke-to-spoke networking guidance: https://learn.microsoft.com/en-us/azure/architecture/networking/guide/spoke-to-spoke-networking
- Microsoft Learn Azure VPN Gateway `GatewaySubnet` guidance: https://learn.microsoft.com/en-us/azure/vpn-gateway/vpn-gateway-howto-vnet-vnet-resource-manager-portal
- Microsoft Learn Azure Bastion configuration settings: https://learn.microsoft.com/en-us/azure/bastion/configuration-settings

## Issues Found
- The original introduction said all spoke and internet traffic flows through the hub without qualifying the required route tables and firewall rules. Updated it to state that this requires the right route tables and firewall rules.
- The architecture diagram and supporting text implied that the Terraform example deploys VPN Gateway, Azure Bastion, and Private DNS. The code only deploys Azure Firewall plus dedicated subnets for gateway and Bastion. Updated the diagram and text to describe reserved subnets and removed the unimplemented Private DNS node.
- The spoke-to-spoke section mentioned firewall rules for spoke address ranges but not outbound internet access. Updated the sentence to note that Azure Firewall also needs explicit rules for any outbound internet access that should be permitted.

## Review Notes
The Terraform snippets use current AzureRM resource names and arguments based on the latest provider documentation reviewed. Terraform CLI was not installed in the workspace, so I could not run `terraform fmt` or `terraform validate` locally.
