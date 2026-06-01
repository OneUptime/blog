# Validation Summary: How to Configure Azure VPN Gateway for Site-to-Site Connectivity

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure VPN Gateway
- Site-to-Site VPN
- Azure Virtual Network
- Azure CLI
- IPsec/IKE
- Azure Network Watcher

## Sources Consulted
- Microsoft Learn: Create a VPN gateway using CLI - https://learn.microsoft.com/en-us/azure/vpn-gateway/create-routebased-vpn-gateway-cli
- Microsoft Learn: Azure VPN Gateway configuration settings - https://learn.microsoft.com/en-us/azure/vpn-gateway/vpn-gateway-about-vpn-gateway-settings
- Microsoft Learn: About Azure VPN Gateway - https://learn.microsoft.com/en-us/azure/vpn-gateway/vpn-gateway-about-vpngateways
- Microsoft Learn: Tutorial: Create a site-to-site VPN connection in the Azure portal - https://learn.microsoft.com/en-us/azure/vpn-gateway/tutorial-site-to-site-portal
- Microsoft Learn: az network vnet-gateway CLI reference - https://learn.microsoft.com/en-us/cli/azure/network/vnet-gateway
- Microsoft Learn: az network vpn-connection CLI reference - https://learn.microsoft.com/en-us/cli/azure/network/vpn-connection
- Microsoft Learn: az network vpn-connection ipsec-policy CLI reference - https://learn.microsoft.com/en-us/cli/azure/network/vpn-connection/ipsec-policy
- Microsoft Learn: az network watcher troubleshooting CLI reference - https://learn.microsoft.com/en-us/cli/azure/network/watcher/troubleshooting
- Microsoft Learn: Configure custom IPsec/IKE connection policies for S2S VPN and VNet-to-VNet - https://learn.microsoft.com/en-us/azure/vpn-gateway/ipsec-ike-policy-howto
- Microsoft Learn: Quickstart: Create a public IP address using the Azure CLI - https://learn.microsoft.com/en-us/azure/virtual-network/ip-services/create-public-ip-cli
- Microsoft Learn: Modify local network gateway settings using the Azure CLI - https://learn.microsoft.com/en-us/azure/vpn-gateway/vpn-gateway-modify-local-network-gateway-cli

## Issues Found
- The GatewaySubnet sizing note said a /28 works but leaves no room for future expansion. For the non-Basic VPN gateway SKU used in the tutorial, Microsoft documents that /27 or larger is required. Updated the note to distinguish Basic from all other VPN gateway SKUs.
- The VPN gateway command used `VpnGw2` and the surrounding text claimed up to 1.25 Gbps without specifying the gateway generation. Microsoft's SKU table lists Generation2 `VpnGw2` at 1.25 Gbps, while Generation1 `VpnGw2` is lower. Added `--vpn-gateway-generation Generation2` and clarified the throughput note.
- The Network Watcher troubleshooting command used `--resource-type vpnGateway`, but the Azure CLI accepts `vnetGateway` or `vpnConnection`. Changed the value to `vnetGateway`.

## Review Notes
- Azure CLI was not installed in the local workspace, so command validation was performed against current Microsoft Learn CLI references rather than local `az --help` output.
- The example storage account and blob container used by the Network Watcher troubleshooting command must exist before running that command.
