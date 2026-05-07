# Validation Summary: How to Configure Azure Dual-Stack VNet with Terraform

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Azure Virtual Network (VNet)
- IPv4 / IPv6 dual-stack networking
- Terraform / HCL
- HashiCorp AzureRM provider
- Azure Public IP resources
- Azure network interfaces
- Azure CLI

## Sources Consulted
- Microsoft Learn, Overview of IPv6 for Azure Virtual Network: https://learn.microsoft.com/en-us/azure/virtual-network/ip-services/ipv6-overview
- Microsoft Learn, Conceptual planning for IPv6 networking: https://learn.microsoft.com/en-us/azure/architecture/networking/guide/ipv6-ip-planning
- Microsoft Learn, Create, change, or delete an Azure virtual network: https://learn.microsoft.com/en-us/azure/virtual-network/manage-virtual-network
- Microsoft Learn, Configure IP addresses for an Azure network interface: https://learn.microsoft.com/en-us/azure/virtual-network/ip-services/virtual-network-network-interface-addresses
- Azure CLI reference, `az network vnet`: https://learn.microsoft.com/en-us/cli/azure/network/vnet?view=azure-cli-latest
- Terraform Registry, `azurerm_virtual_network`: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/virtual_network
- Terraform Registry, `azurerm_subnet`: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/subnet
- Terraform Registry, `azurerm_public_ip`: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/public_ip
- Terraform Registry, `azurerm_network_interface`: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/network_interface
- Terraform Registry, AzureRM 4.0 upgrade guide: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/guides/4.0-upgrade-guide?product_intent=terraform
- HashiCorp Developer, Provider Requirements: https://developer.hashicorp.com/terraform/language/providers/requirements

## Issues Found
- The introduction overstated Azure IPv6 support by implying services in general can be assigned both families. Microsoft documents feature limitations for IPv6-enabled Azure services, so I changed the wording to "VMs and supported services."
- The IPv6 VNet example used a random global-looking prefix and the comment conflated private ULA space with BYOIP-style public/global address ownership. I replaced the example with a valid ULA prefix and updated the matching subnet `/64` prefixes so the examples stay internally consistent and align with Microsoft's IPv6 planning guidance.
- The execution section started with `terraform apply`, but HashiCorp documents that local provider installation happens during `terraform init`. I added `terraform init` before `terraform apply`.
- The VNet verification command queried the full `addressSpace` object rather than the actual list of configured prefixes. I changed the JMESPath query to `addressSpace.addressPrefixes` so it matches the text and returns the specific values being verified.

## Review Notes
- The post pins the AzureRM provider to `~> 3.0`. That constraint is still valid, but it is not the current provider major version. If this post is later upgraded to AzureRM 4.x, HashiCorp's upgrade guidance says the subscription ID must be supplied via `subscription_id` or `ARM_SUBSCRIPTION_ID`.
- The IPv6 subnet examples correctly use `/64`, which Microsoft documents as the required subnet size for Azure IPv6 subnets.
- If this tutorial is later extended into a full VM reachability example, it should also show the required NSG rules because Standard SKU public IPs do not permit inbound traffic until explicitly allowed.
- Local checks: `validation.json` was validated with `jq`. Runtime validation with `terraform` and `az` was not possible in this workspace because neither CLI is installed, so the review relied on current official documentation.
