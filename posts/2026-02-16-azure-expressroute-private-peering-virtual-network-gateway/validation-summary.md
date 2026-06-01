# Validation Summary: How to Configure Azure ExpressRoute Private Peering with Virtual Network Gateway

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Azure ExpressRoute
- Azure ExpressRoute private peering
- Azure Virtual Network Gateway
- Azure CLI
- BGP
- Azure Virtual Network peering and gateway transit

## Sources Consulted
- Microsoft Learn: Azure ExpressRoute routing requirements - https://learn.microsoft.com/en-us/azure/expressroute/expressroute-routing
- Microsoft Learn: Configure ExpressRoute private peering - https://learn.microsoft.com/en-us/azure/expressroute/configure-expressroute-private-peering
- Microsoft Learn: About ExpressRoute virtual network gateways - https://learn.microsoft.com/en-us/azure/expressroute/expressroute-about-virtual-network-gateways
- Microsoft Learn: Azure CLI `az network express-route` reference - https://learn.microsoft.com/en-us/cli/azure/network/express-route
- Microsoft Learn: Azure CLI `az network express-route peering` reference - https://learn.microsoft.com/en-us/cli/azure/network/express-route/peering
- Microsoft Learn: Azure CLI `az network vnet-gateway` reference - https://learn.microsoft.com/en-us/cli/azure/network/vnet-gateway
- Microsoft Learn: Azure CLI `az network vpn-connection` reference - https://learn.microsoft.com/en-us/cli/azure/network/vpn-connection
- Microsoft Learn: Verify Azure ExpressRoute connectivity troubleshooting guide - https://learn.microsoft.com/en-us/troubleshoot/azure/expressroute/expressroute-troubleshooting-expressroute-overview

## Issues Found
- The private peering /30 address allocation was reversed. Microsoft documentation states that the customer router uses the first usable IP address and Microsoft uses the second usable IP address. Updated the primary and secondary subnet descriptions accordingly.
- The gateway deployment section incorrectly said a customer-created public IP is required for ExpressRoute private peering. Current Microsoft documentation says ExpressRoute virtual network gateways use an auto-assigned Microsoft-managed public IP. Removed the explicit public IP creation and `--public-ip-address` argument.
- The gateway command used `--no-wait` and then proceeded immediately to the connection step. Added an `az network vnet-gateway wait --created` command so the tutorial flow waits for gateway deployment before creating the connection.
- The gateway resize statement was too broad. Updated it to clarify that upgrades are supported without downtime only within the same SKU family, while downgrades or switching between availability-zone and non-availability-zone families requires deleting and recreating the gateway.
- The ExpressRoute peering verification command queried `primaryAzurePort` and `secondaryAzurePort` as if they were peer state fields. Replaced the query with `provisioningState`, `peerAsn`, and `vlanId`, and updated the expected status text to `Succeeded`.
- The advertised routes example used Azure's BGP IP as the peer address after correcting the /30 allocation. Updated the peer IP to the customer router's primary BGP peer IP.
- The monitoring section used `az network express-route show --query serviceProviderProperties` for circuit statistics and described `az network express-route get-stats` as an ARP table command. Updated the section to use `get-stats` for statistics and `list-arp-tables` for ARP information.

## Review Notes
The Azure CLI binary was not installed in the local environment, so command validation was performed against current official Microsoft Learn CLI references rather than local `az --help` output. The post is technically relevant and remains a valid Azure networking tutorial after the corrections.
