# Validation Summary: How to Build Azure Virtual Network Peering

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Virtual Network peering
- Azure cross-subscription networking
- Azure VPN/ExpressRoute gateway transit
- Terraform
- HashiCorp AzureRM provider
- Terraform provider aliases and modules
- Azure RBAC role assignments

## Sources Consulted
- Azure Virtual Network peering overview: https://learn.microsoft.com/en-us/azure/virtual-network/virtual-network-peering-overview
- Create, change, or delete Azure virtual network peering: https://learn.microsoft.com/en-us/azure/virtual-network/virtual-network-manage-peering
- Terraform providers within modules: https://developer.hashicorp.com/terraform/language/modules/develop/providers
- AzureRM `azurerm_virtual_network_peering` provider documentation/source: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/virtual_network_peering and https://github.com/hashicorp/terraform-provider-azurerm/blob/v4.74.0/internal/services/network/virtual_network_peering_resource.go
- AzureRM `azurerm_role_assignment` provider documentation: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/role_assignment

## Issues Found
- The reusable Terraform module example initially used only one provider configuration even though the hub-side peering and spoke-side peering need different AzureRM provider configurations. I changed the module to declare `configuration_aliases = [azurerm.hub, azurerm.spoke]`, set `provider = azurerm.hub` and `provider = azurerm.spoke` on the two peering resources, and pass both provider configurations from the caller.
- The role assignment snippet referenced `data.azuread_service_principal.production.object_id` without defining the AzureAD provider or the data source. I changed the snippet to accept the service principal object ID as a variable and use that value as `principal_id`.
- The gateway transit conflict explanation implied that multiple spokes using the same hub gateway could be the conflict. I changed it to the Azure constraint: a VNet can use either its own gateway or one remote gateway, so `use_remote_gateways = true` should be enabled on only one peering for a spoke VNet, with `allow_gateway_transit = true` on the matching hub-side peering.
- The permissions explanation overstated the need for full `Network Contributor` on both VNets for every operation. I clarified that the peering creator needs the required peering permissions on the local VNet where it creates the peering and read access to the remote VNet; `Network Contributor` remains a valid built-in role that satisfies these requirements.

## Review Notes
The post pins the AzureRM provider to `~> 3.80`, while the current provider line is 4.x. The examples remain valid for the pinned 3.x provider family, but a future update could modernize the version constraint and retest against AzureRM 4.x.
