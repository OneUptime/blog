# Validation Summary: How to Design a Hub-Spoke Network Topology in Azure with Virtual Network Peering

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Virtual Network
- Azure hub-spoke network architecture
- Azure Virtual Network peering
- Azure Firewall
- Azure route tables and user-defined routes
- Azure Private DNS Zones
- Azure Bastion
- Azure VPN Gateway and ExpressRoute gateway transit
- Azure CLI

## Sources Consulted
- Microsoft Learn: Hub-spoke network topology in Azure - https://learn.microsoft.com/en-us/azure/architecture/reference-architectures/hybrid-networking/hub-spoke
- Microsoft Learn: Azure virtual network peering - https://learn.microsoft.com/en-us/azure/virtual-network/virtual-network-peering-overview
- Microsoft Learn: Create, change, or delete Azure Virtual Network peering - https://learn.microsoft.com/en-us/azure/virtual-network/virtual-network-manage-peering
- Microsoft Learn: az network vnet peering - https://learn.microsoft.com/en-us/cli/azure/network/vnet/peering
- Microsoft Learn: az network firewall - https://learn.microsoft.com/en-us/cli/azure/network/firewall
- Microsoft Learn: Deploy and configure Azure Firewall using Azure CLI - https://learn.microsoft.com/en-us/azure/firewall/deploy-cli
- Microsoft Learn: Azure Firewall FAQ - https://learn.microsoft.com/en-us/azure/firewall/firewall-faq
- Microsoft Learn: FQDN tags overview for Azure Firewall - https://learn.microsoft.com/en-us/azure/firewall/fqdn-tags
- Microsoft Learn: az network firewall network-rule - https://learn.microsoft.com/en-us/cli/azure/network/firewall/network-rule
- Microsoft Learn: az network firewall application-rule - https://learn.microsoft.com/en-us/cli/azure/network/firewall/application-rule
- Microsoft Learn: az network route-table - https://learn.microsoft.com/en-us/cli/azure/network/route-table
- Microsoft Learn: az network route-table route - https://learn.microsoft.com/en-us/cli/azure/network/route-table/route
- Microsoft Learn: az network private-dns link vnet - https://learn.microsoft.com/en-us/cli/azure/network/private-dns/link/vnet
- Microsoft Learn: Azure Private Endpoint private DNS zone values - https://learn.microsoft.com/en-us/azure/private-link/private-endpoint-dns
- Microsoft Learn: About Azure Bastion configuration settings - https://learn.microsoft.com/en-us/azure/bastion/configuration-settings

## Issues Found
- The peering commands enabled `--allow-gateway-transit` and `--use-remote-gateways` even though the tutorial only created `GatewaySubnet` and did not deploy a VPN gateway, ExpressRoute gateway, or Route Server. Azure requires the remote VNet to have a gateway or route server before a spoke can use remote gateways. I removed those flags from the base peering commands and added a short note explaining when to enable them.
- The topology explanation implied that peering alone makes all spoke-to-spoke, internet, and on-premises traffic flow through the hub. VNet peering provides direct connectivity and is not transitive by itself; hub routing requires user-defined routes and forwarding infrastructure. I updated the wording to make the routing dependency explicit.
- The routing example comment said it routed all traffic to other spokes, but the command only created a route to the dev spoke CIDR. I changed the comment to match the command and added a note that equivalent routes are needed for each spoke subnet so return traffic also follows the firewall path.
- The Private DNS comment said to link the zone to all VNets, while the example only linked the hub and production VNets. I changed the comment to say to link each VNet that needs to resolve records in the zone.

## Review Notes
- Azure CLI is not installed in the local environment, so command validation was performed against Microsoft Learn CLI reference pages rather than local `az --help` output.
- The article uses classic Azure Firewall rule collection commands, which are still documented and valid. Azure Firewall Policy may be preferable for larger production environments, but that is an architectural improvement rather than a correctness issue.
