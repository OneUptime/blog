# Validation Summary: How to Configure Azure Route Tables with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- Azure Virtual Network
- Azure Route Tables / User-Defined Routes (UDRs)
- Azure Firewall / Network Virtual Appliances
- Azure VPN Gateway
- Azure Kubernetes Service (AKS) kubenet networking
- Azure CLI
- AzureRM provider

## Sources Consulted
- Terraform Registry, `azurerm_route_table`: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/route_table
- Terraform Registry, `azurerm_subnet_route_table_association`: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/subnet_route_table_association
- Microsoft Learn, Azure virtual network traffic routing: https://learn.microsoft.com/en-us/azure/virtual-network/virtual-networks-udr-overview
- Microsoft Learn, create/change/delete an Azure route table: https://learn.microsoft.com/en-us/azure/virtual-network/manage-route-table
- Microsoft Learn, configure kubenet networking in AKS: https://learn.microsoft.com/en-us/azure/aks/configure-kubenet
- Microsoft Learn, diagnose a VM network routing problem with Azure CLI: https://learn.microsoft.com/en-us/azure/network-watcher/diagnose-vm-network-routing-problem-cli
- Microsoft Learn, `az network nic show-effective-route-table`: https://learn.microsoft.com/en-us/cli/azure/network/nic?view=azure-cli-latest#az-network-nic-show-effective-route-table
- Microsoft Learn, `az network watcher show-next-hop`: https://learn.microsoft.com/en-us/cli/azure/network/watcher?view=azure-cli-latest#az-network-watcher-show-next-hop
- Microsoft Learn, `az network watcher test-ip-flow`: https://learn.microsoft.com/en-us/cli/azure/network/watcher?view=azure-cli-latest#az-network-watcher-test-ip-flow

## Issues Found
- The post used the older AzureRM argument `disable_bgp_route_propagation`. Current AzureRM documentation uses `bgp_route_propagation_enabled`, so I updated the field name and inverted the boolean values to preserve the intended behavior.
- The post said `next_hop_type = "VirtualNetworkGateway"` was for a "VPN/ExpressRoute gateway". Azure documents `VirtualNetworkGateway` as supported for UDR next hops only when the virtual network gateway is a VPN gateway, so I corrected that wording.
- The AKS kubenet section said a pre-existing route table was required and implied the BGP propagation setting was needed for AKS. Microsoft’s AKS documentation says a route table must exist on the cluster subnet, but AKS can create one if the subnet does not already have one. I corrected the explanation and removed the misleading BGP-related line.
- The multi-region example accepted `subnet_ids` but never associated the route tables to those subnets, so the example would not actually apply the regional route tables. I added the missing association resource.
- The troubleshooting section used `az network watcher test-ip-flow` as a routing diagnostic. Azure CLI documents that command as an NSG rule test, not a route-selection tool, so I replaced it with `az network watcher show-next-hop` and noted the Network Watcher prerequisite.

## Review Notes
- The post now matches the current AzureRM route table argument names shown in the latest official registry docs. Older blog posts may still show `disable_bgp_route_propagation`, but that is not the current documented field.
- `az network nic show-effective-route-table` and `az network watcher show-next-hop` rely on Azure-side prerequisites such as an applicable NIC/VM and Network Watcher being enabled in the VM's region.
- Local execution of `az` and `tofu` was not possible in this environment because those binaries are not installed, so command verification was done against official Microsoft Learn and Terraform Registry documentation.
