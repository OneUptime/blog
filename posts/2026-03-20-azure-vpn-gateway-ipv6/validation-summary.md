# Validation Summary: How to Configure Azure VPN Gateway with IPv6

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure VPN Gateway
- Azure Virtual Network
- IPv6 dual-stack networking
- Site-to-Site VPN
- Point-to-Site VPN
- Azure CLI
- Terraform (`hashicorp/azurerm`)
- Microsoft Entra ID authentication for Azure VPN Client

## Sources Consulted
- Microsoft Learn: Configure IPv6 for VPN Gateway using the Azure portal - Preview https://learn.microsoft.com/en-us/azure/vpn-gateway/ipv6-configuration
- Microsoft Learn: Create a site-to-site IPv6 VPN connection in dual stack using Azure CLI - Preview https://learn.microsoft.com/en-us/azure/vpn-gateway/site-to-site-ipv6-azure-cli
- Microsoft Learn: Manage a public IP address with a VPN gateway https://learn.microsoft.com/en-us/azure/virtual-network/ip-services/configure-public-ip-vpn-gateway
- Microsoft Learn: About Point-to-Site VPN https://learn.microsoft.com/en-us/azure/vpn-gateway/point-to-site-about
- Microsoft Learn: Configure P2S VPN Gateway for Microsoft Entra ID authentication https://learn.microsoft.com/en-us/azure/vpn-gateway/point-to-site-entra-gateway
- Microsoft Learn: About Azure VPN Gateway https://learn.microsoft.com/en-us/azure/vpn-gateway/vpn-gateway-about-vpngateways
- Microsoft Learn: Azure VPN Gateway configuration settings https://learn.microsoft.com/en-us/azure/vpn-gateway/vpn-gateway-about-vpn-gateway-settings
- Microsoft Learn: What's new in Azure VPN Gateway? https://learn.microsoft.com/en-us/azure/vpn-gateway/whats-new
- Azure CLI reference: `az network public-ip` https://learn.microsoft.com/en-us/cli/azure/network/public-ip?view=azure-cli-lts
- Azure CLI reference: `az network local-gateway` https://learn.microsoft.com/en-us/cli/azure/network/local-gateway?view=azure-cli-lts
- Azure CLI reference: `az network vpn-connection` https://learn.microsoft.com/en-us/cli/azure/network/vpn-connection?view=azure-cli-latest
- Terraform Registry: `azurerm_virtual_network_gateway` https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/virtual_network_gateway
- Terraform Registry: `azurerm_local_network_gateway` https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/local_network_gateway
- Terraform Registry: `azurerm_virtual_network_gateway_connection` https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/virtual_network_gateway_connection
- Terraform Registry: `azurerm_public_ip` https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/public_ip

## Issues Found
- The post treated Azure VPN Gateway IPv6 as generally available and described S2S as using IPv6 outer tunnel transport. I corrected the introduction and conclusion to match Microsoft Learn: the feature is currently in preview, requires subscription opt-in, and supports IPv6 only as inner traffic through the VPN tunnel.
- The CLI and Terraform examples created an IPv6 public IP for the VPN gateway. Microsoft documents that VPN Gateways do not support public IPv6 addresses, so I removed the IPv6 public IP guidance and kept the gateway public IP as IPv4.
- The post omitted the preview enrollment prerequisite. I added the Microsoft-documented opt-in step using `vpngwipv6preview@microsoft.com`.
- Several sample IPv6 prefixes were invalid (`fd00:vpn::/48`, `fd00:clients::/64`, `fd00:onprem::/48`) because those hextets are not valid hexadecimal IPv6 notation. I replaced them with valid unique local IPv6 prefixes.
- The CLI walkthrough defined `LOCATION` but did not use it and assumed the resource group already existed. I added `az group create` and explicit `--location` flags so the example works as written.
- The Terraform snippet used `enable_bgp`, which is not a valid `azurerm_virtual_network_gateway` argument. I corrected it to `bgp_enabled`.
- The Terraform snippet used a legacy Microsoft Entra audience value for Azure VPN Client. I updated it to the current Microsoft-registered Azure VPN Client App ID audience value recommended by Microsoft Learn.
- The Terraform `traffic_selector_policy` block used incorrect argument names and was presented as if required to enable IPv6. I removed it because the documented dual-stack configuration relies on IPv4/IPv6 address spaces on the VNet and local network gateway, not that optional block.
- The verification section queried the gateway resource for public IP resource IDs instead of the actual public IP value, and the VPN connection query did not match the documented status fields. I updated the commands to show the public IP address and the documented `provisioningState` and `connectionStatus`.
- The conclusion incorrectly stated that dual-stack IPv6 requires `VpnGw2` or higher. I corrected this to the documented preview support range of `VpnGw1-5` and `VpnGw1AZ-5AZ` for new deployments, while leaving the example on `VpnGw2`.

## Review Notes
- The Terraform snippet remains a partial example and still assumes supporting resources and variables such as `azurerm_resource_group.main`, `azurerm_subnet.gateway`, `var.tenant_id`, and `var.vpn_shared_key` are defined elsewhere.
- Microsoft’s current dual-stack IPv6 walkthrough for S2S uses an active-active gateway example with two IPv4 public IPs and two connections for high availability. This post now uses a simpler active-standby pattern, which is still consistent with the documented feature limits.
- Dual-stack IPv6 support for Azure VPN Gateway is still preview as of the Microsoft Learn pages updated on April 3, 2026 and April 8, 2026, so behavior and requirements may change before general availability.
