# Validation Summary: How to Configure Azure IPv6 Public IPs with Terraform

## Status
validated

## Post Type
Guide

## Technologies Covered
- Microsoft Azure Public IP addresses
- Azure Virtual Network dual-stack IPv4/IPv6 networking
- Azure Application Gateway
- Azure CLI
- Terraform `hashicorp/azurerm` provider

## Sources Consulted
- Microsoft Learn: Public IP addresses in Azure - https://learn.microsoft.com/en-us/azure/virtual-network/ip-services/public-ip-addresses
- Microsoft Learn: Create, change, or delete an Azure public IP address - https://learn.microsoft.com/en-us/azure/virtual-network/ip-services/virtual-network-public-ip-address
- Microsoft Learn: Configure IP addresses for an Azure network interface - https://learn.microsoft.com/en-us/azure/virtual-network/ip-services/virtual-network-network-interface-addresses
- Microsoft Learn: What is IPv6 for Azure Virtual Network? - https://learn.microsoft.com/en-us/azure/virtual-network/ip-services/ipv6-overview
- Microsoft Learn: Create an Azure virtual machine with a dual-stack network - https://learn.microsoft.com/en-us/azure/virtual-network/ip-services/create-vm-dual-stack-ipv6-portal
- Microsoft Learn: Configure Application Gateway with a frontend public IPv6 address using the Azure portal - https://learn.microsoft.com/en-us/azure/application-gateway/ipv6-application-gateway-portal
- Microsoft Learn: Azure CLI `az network public-ip` reference - https://learn.microsoft.com/en-us/cli/azure/network/public-ip?view=azure-cli-latest
- HashiCorp AzureRM provider docs: `azurerm_public_ip` - https://github.com/hashicorp/terraform-provider-azurerm/blob/main/website/docs/r/public_ip.html.markdown
- HashiCorp AzureRM provider docs: `azurerm_network_interface` - https://github.com/hashicorp/terraform-provider-azurerm/blob/main/website/docs/r/network_interface.html.markdown

## Issues Found
- The introduction said IPv6 public IPs are "assigned dynamically." That is inaccurate for Standard IPv6 public IPs, which use static allocation; the wording was corrected to reflect Azure's current behavior.
- The post described the target use cases as including firewalls and specifically said Azure Firewall and similar services require dual public IPs. Microsoft documents that Azure Firewall doesn't currently support IPv6, so the references were corrected to application gateways and other dual-stack services that do support separate IPv4 and IPv6 public IP resources.
- The VM NIC example depended on dual-stack networking prerequisites that were not stated. A prerequisite and inline note were added to clarify that the NIC example assumes an existing dual-stack subnet and an IPv4 public IP.

## Review Notes
- The Terraform arguments used in the post (`sku`, `ip_version`, `allocation_method`, `public_ip_address_id`, and `private_ip_address_version`) remain aligned with current AzureRM provider documentation.
- The post pins `hashicorp/azurerm` to `~> 3.0`. The reviewed examples still use valid arguments, but current upstream documentation is published against newer AzureRM releases.
