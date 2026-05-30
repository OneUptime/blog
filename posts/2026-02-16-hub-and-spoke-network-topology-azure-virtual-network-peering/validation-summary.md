# Validation Summary: How to Set Up Hub-and-Spoke Network Topology with Azure Virtual Network Peering

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Azure Virtual Network
- Azure Virtual Network peering
- Azure Firewall
- Azure VPN Gateway gateway transit concepts
- Azure user-defined routes and route tables
- Azure CLI

## Sources Consulted
- Microsoft Learn: Azure CLI `az network vnet peering` reference - https://learn.microsoft.com/en-us/cli/azure/network/vnet/peering
- Microsoft Learn: Create, change, or delete Azure virtual network peering - https://learn.microsoft.com/en-us/azure/virtual-network/virtual-network-manage-peering
- Microsoft Learn: Deploy and configure Azure Firewall using Azure CLI - https://learn.microsoft.com/en-us/azure/firewall/deploy-cli
- Microsoft Learn: Azure CLI `az network firewall` reference - https://learn.microsoft.com/en-us/cli/azure/network/firewall
- Microsoft Learn: Azure CLI `az network firewall network-rule` reference - https://learn.microsoft.com/en-us/cli/azure/network/firewall/network-rule
- Microsoft Learn: Virtual network connectivity options and spoke-to-spoke communication - https://learn.microsoft.com/en-us/azure/architecture/reference-architectures/hybrid-networking/virtual-network-peering

## Issues Found
- The peering examples enabled `--allow-gateway-transit` and `--use-remote-gateways` even though the tutorial creates only `GatewaySubnet` and does not deploy a VPN or ExpressRoute gateway. Azure allows remote gateway use only when the remote VNet has a gateway or route server and the corresponding transit option is enabled. I removed those flags from the base commands and kept the gateway-transit guidance as an optional later step.
- The Azure Firewall deployment used `az network firewall create --public-ip pip-azfw`, but the current Azure CLI flow attaches the public IP with `az network firewall ip-config create --public-ip-address`. I updated the firewall deployment commands to create the firewall, add the IP configuration, and update the firewall.
- The route-table example hard-coded `10.0.2.4` as the Azure Firewall private IP after telling readers to retrieve the actual private IP. I changed the example to store the firewall private IP in `FW_PRIVATE_IP` and use that variable in the UDR.

## Review Notes
- I could not run Azure CLI commands locally because `az` is not installed in this environment, so CLI validation was performed against current Microsoft Learn command references.
- The tutorial intentionally uses broad firewall rules for demonstration and correctly notes that production rules should be more granular.
