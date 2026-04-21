# Validation Summary: How to Create Azure VNet with IPv4 Subnets Using Terraform

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform
- HashiCorp AzureRM provider
- Azure Virtual Network
- Azure subnets
- Azure service endpoints
- Azure subnet delegation
- Azure Kubernetes Service (AKS)
- Azure VPN Gateway / ExpressRoute GatewaySubnet
- Azure virtual network peering

## Sources Consulted
- HashiCorp Terraform AzureRM provider - `azurerm_virtual_network`: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/virtual_network
- HashiCorp Terraform AzureRM provider - `azurerm_subnet`: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/subnet
- HashiCorp Terraform AzureRM provider - `azurerm_virtual_network_peering`: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/virtual_network_peering
- Microsoft Learn - Azure virtual network service endpoints: https://learn.microsoft.com/en-us/azure/virtual-network/virtual-network-service-endpoints-overview
- Microsoft Learn - Azure Virtual Network FAQ: https://learn.microsoft.com/en-us/azure/virtual-network/virtual-networks-faq
- Microsoft Learn - Tutorial: Connect virtual networks with virtual network peering: https://learn.microsoft.com/en-us/azure/virtual-network/tutorial-connect-virtual-networks
- Microsoft Learn - Create a virtual network gateway: https://learn.microsoft.com/en-us/azure/vpn-gateway/create-gateway-powershell
- Microsoft Learn - Troubleshoot the AKS SubnetIsDelegated error code: https://learn.microsoft.com/en-us/troubleshoot/azure/azure-kubernetes/error-codes/subnetisdelegated-error

## Issues Found
- The service endpoint comment said it was only for Azure SQL, but the code also enabled `Microsoft.Storage`. Updated the comment to mention both Azure SQL and Storage.
- The VNet peering example referenced `azurerm_virtual_network.secondary` without defining it. Added a secondary VNet with a non-overlapping IPv4 address space.
- The VNet peering example created only one peering link. Azure requires bidirectional peering links before the peerings reach `Connected`, so I added the reciprocal `secondary_to_main` peering resource.
- The conclusion implied that service endpoints alone restrict Azure PaaS access to specific subnets. Updated the wording to state that service endpoints must be paired with service-side network rules.

## Review Notes
- The AzureRM `azurerm_virtual_network`, `azurerm_subnet`, and `azurerm_virtual_network_peering` resource arguments used in the examples are current and valid.
- `address_prefixes` is the current subnet argument and the sample subnet CIDRs are inside the VNet address space without overlap.
- `GatewaySubnet` is the required gateway subnet name for VPN/ExpressRoute gateways, and the sample `/27` prefix matches Microsoft guidance.
- The AKS delegation value `Microsoft.ContainerService/managedClusters` and subnet join action are valid for Azure subnet delegation.
