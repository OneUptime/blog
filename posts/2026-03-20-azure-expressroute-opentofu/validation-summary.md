# Validation Summary: How to Set Up Azure ExpressRoute with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu
- HCL
- Microsoft Azure ExpressRoute
- Azure Virtual Network Gateway
- Azure CLI
- BGP
- ExpressRoute Global Reach

## Sources Consulted
- Microsoft Learn: Azure ExpressRoute overview — https://learn.microsoft.com/en-us/azure/expressroute/expressroute-introduction
- Microsoft Learn: Azure ExpressRoute prerequisites — https://learn.microsoft.com/en-us/azure/expressroute/expressroute-prerequisites
- Microsoft Learn: Azure ExpressRoute circuits and peering — https://learn.microsoft.com/en-us/azure/expressroute/expressroute-circuit-peerings
- Microsoft Learn: Azure ExpressRoute routing requirements — https://learn.microsoft.com/en-us/azure/expressroute/expressroute-routing
- Microsoft Learn: About ExpressRoute virtual network gateways — https://learn.microsoft.com/en-us/azure/expressroute/expressroute-about-virtual-network-gateways
- Microsoft Learn: Quickstart for creating and modifying ExpressRoute circuits — https://learn.microsoft.com/en-us/azure/expressroute/expressroute-howto-circuit-portal-resource-manager
- Microsoft Learn: Configure ExpressRoute Global Reach — https://learn.microsoft.com/en-us/azure/expressroute/expressroute-howto-set-global-reach
- Azure CLI reference: `az network express-route` — https://learn.microsoft.com/en-us/cli/azure/network/express-route
- Azure CLI reference: `az network express-route peering` — https://learn.microsoft.com/en-us/cli/azure/network/express-route/peering
- Terraform Registry: `azurerm_express_route_circuit` — https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/express_route_circuit
- Terraform Registry: `azurerm_express_route_circuit_peering` — https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/express_route_circuit_peering
- Terraform Registry: `azurerm_virtual_network_gateway` — https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/virtual_network_gateway
- Terraform Registry: `azurerm_virtual_network_gateway_connection` — https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/virtual_network_gateway_connection
- Terraform Registry: `azurerm_express_route_circuit_connection` — https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/express_route_circuit_connection

## Issues Found
- The introduction said ExpressRoute provides up to 100 Gbps bandwidth. I corrected this to distinguish provider-provisioned circuits, which go up to 10 Gbps, from ExpressRoute Direct, which supports 10 Gbps, 100 Gbps, or 400 Gbps connectivity.
- The prerequisites implied the circuit must already be provisioned by the provider before starting. I changed this to requiring a selected connectivity provider for the target peering location, which matches the actual workflow where you create the circuit first and then share the service key.
- The ExpressRoute gateway example incorrectly created and attached a user-managed `azurerm_public_ip`. I removed that resource and the `public_ip_address_id` reference because current AzureRM documentation says `public_ip_address_id` should not be specified for `type = "ExpressRoute"`, and Azure now manages the gateway public IP automatically.
- The private peering step implied that all ExpressRoute circuits require customer-managed routing configuration. I added a clarification that managed Layer 3 providers handle routing themselves, while self-managed peering configuration applies to Layer 2 connectivity scenarios.
- The FastPath comment listed only `ErGw3AZ` and `UltraPerformance` as supported SKUs. I updated the comment to avoid an outdated hardcoded list and describe the requirement more accurately.
- The conclusion gave a fixed provider provisioning estimate of 3-5 business days. I replaced it with a doc-backed statement that provisioning time varies and that you should wait for `serviceProviderProvisioningState` to become `Provisioned`.

## Review Notes
- The Azure CLI commands in the post match the current official CLI reference. The `az` binary is not installed in this workspace, so command syntax was verified against Microsoft Learn rather than local `--help` output.
- The OpenTofu snippets are valid HCL for current AzureRM resource shapes, but actual deployment still depends on using a peering location, provider name, VLAN ID, and BGP settings that are valid for the target ExpressRoute circuit.
