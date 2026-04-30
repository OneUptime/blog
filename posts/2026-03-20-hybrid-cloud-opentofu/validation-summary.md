# Validation Summary: How to Build a Hybrid Cloud Architecture with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu / HCL
- AWS Site-to-Site VPN
- AWS Direct Connect
- Azure ExpressRoute
- Azure Virtual Network Gateway
- Google Cloud HA VPN
- Google Cloud Router
- BGP

## Sources Consulted
- AWS Site-to-Site VPN quotas: https://docs.aws.amazon.com/vpn/latest/s2svpn/vpn-limits.html
- Configure tunnel options for AWS Site-to-Site VPN: https://docs.aws.amazon.com/vpn/latest/s2svpn/tunnel-configure.html
- Direct Connect virtual private gateway associations: https://docs.aws.amazon.com/directconnect/latest/UserGuide/virtualgateways.html
- Direct Connect virtual interfaces and hosted virtual interfaces: https://docs.aws.amazon.com/directconnect/latest/UserGuide/WorkingWithVirtualInterfaces.html
- Terraform AWS Provider Version 6 Upgrade Guide: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/guides/version-6-upgrade
- About ExpressRoute virtual network gateways: https://learn.microsoft.com/en-us/azure/expressroute/expressroute-about-virtual-network-gateways
- Quickstart: Create an ExpressRoute circuit and virtual network gateway with Terraform: https://learn.microsoft.com/en-us/azure/expressroute/quickstart-create-expressroute-vnet-terraform
- Azure ExpressRoute routing requirements: https://learn.microsoft.com/en-us/azure/expressroute/expressroute-routing
- Configure peering for an ExpressRoute circuit: https://learn.microsoft.com/en-us/azure/expressroute/expressroute-howto-routing-arm
- azurerm_virtual_network_gateway: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/virtual_network_gateway
- azurerm_express_route_circuit_peering: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/express_route_circuit_peering
- azurerm_virtual_network_gateway_connection: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/virtual_network_gateway_connection
- Terraform examples for HA VPN gateways: https://cloud.google.com/network-connectivity/docs/vpn/how-to/automate-vpn-setup-with-terraform
- Create an HA VPN gateway to a peer VPN gateway: https://cloud.google.com/network-connectivity/docs/vpn/how-to/creating-ha-vpn
- HA VPN topologies: https://cloud.google.com/network-connectivity/docs/vpn/concepts/topologies
- Configure the peer VPN gateway: https://cloud.google.com/network-connectivity/docs/vpn/how-to/configuring-peer-gateway

## Issues Found
- The AWS Direct Connect example created a Direct Connect gateway and private virtual interface but did not associate the Direct Connect gateway with a virtual private gateway for VPC connectivity. I added `aws_dx_gateway_association`, used the current `associated_gateway_id` argument, and advertised the VPC CIDR through the association.
- The AWS Direct Connect BGP peer IP example was changed to a dedicated private `/30` example so it aligns with AWS private virtual interface guidance.
- The Azure ExpressRoute gateway example specified `public_ip_address_id` on an `azurerm_virtual_network_gateway` with `type = "ExpressRoute"`. Current provider documentation says this should not be specified for ExpressRoute gateways, so I removed it.
- The Azure example referenced a generic subnet for the gateway. I changed it to an explicit `GatewaySubnet`, which is required for Azure virtual network gateways.
- The Azure example stopped before configuring Azure private peering and the virtual network gateway connection to the ExpressRoute circuit. I added both so the cloud-side configuration matches the post's stated goal.
- The GCP example created the HA VPN gateway, external peer gateway, and Cloud Router but omitted the VPN tunnels, Cloud Router interfaces, and BGP peers required for a working HA VPN deployment. I added those resources following the official Terraform examples.
- The summary sentence treated "up to 1.25 Gbps" as a generic VPN limit across providers. That number is AWS-specific, so I rewrote the sentence to avoid a cross-cloud overgeneralization.

## Review Notes
- The post is now technically accurate for the cloud-side resources it shows, but production hybrid connectivity still requires matching on-premises router configuration and, for dedicated circuits, provider-side provisioning steps outside OpenTofu.
- Throughput, SLA, and failover characteristics vary by cloud provider, gateway SKU, and topology.
