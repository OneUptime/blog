# Validation Summary: How to Set Up Azure VPN Gateway with Active-Active Configuration

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure VPN Gateway
- Active-active site-to-site VPN
- Azure CLI
- Azure public IP addresses
- BGP
- IPsec/IKE tunnels
- Local network gateways

## Sources Consulted
- Microsoft Learn: About active-active mode VPN gateways - https://learn.microsoft.com/en-us/azure/vpn-gateway/about-active-active-gateways
- Microsoft Learn: About BGP and VPN Gateway - https://learn.microsoft.com/en-us/azure/vpn-gateway/vpn-gateway-bgp-overview
- Microsoft Learn: Create a virtual network gateway - CLI - https://learn.microsoft.com/en-us/azure/vpn-gateway/create-routebased-vpn-gateway-cli
- Microsoft Learn: Azure CLI `az network vnet-gateway` reference - https://learn.microsoft.com/en-us/cli/azure/network/vnet-gateway
- Microsoft Learn: Azure CLI `az network local-gateway` reference - https://learn.microsoft.com/en-us/cli/azure/network/local-gateway
- Microsoft Learn: Azure CLI `az network vpn-connection` reference - https://learn.microsoft.com/en-us/cli/azure/network/vpn-connection
- Microsoft Learn: What is Azure VPN Gateway? - https://learn.microsoft.com/en-us/azure/vpn-gateway/vpn-gateway-about-vpngateways
- Microsoft Learn: Azure VPN Gateway FAQ - https://learn.microsoft.com/en-us/azure/vpn-gateway/vpn-gateway-vpn-faq

## Issues Found
- The gateway creation command used `--active-active true`, but the current Azure CLI documentation creates an active-active gateway by specifying two public IP addresses with `--public-ip-addresses`. Removed the unsupported flag.
- The post said Basic SKU public IPs work when zone redundancy is not needed. Active-active VPN gateways require two Standard SKU public IP addresses with static allocation, so the statement was corrected.
- The ASN explanation said any private ASN could be used. Azure has ASN constraints and the Azure/on-premises ASNs must differ, so the wording was narrowed to "another supported public or private ASN as long as it differs from your on-premises ASN."
- The failover description implied a fully seamless transition for established connections. Microsoft documentation describes tunnel disconnect, route withdrawal, and automatic switch over, so the wording was corrected.
- The throughput section claimed active-active effectively doubles aggregate throughput and labeled SKU numbers as per-instance throughput. Microsoft documents those values as aggregate throughput benchmarks and notes active-active throughput gains vary with traffic patterns, so the table and explanation were corrected.

## Review Notes
The local environment did not have Azure CLI installed, so command validation was performed against current Microsoft Learn Azure CLI reference pages rather than local `az --help` output.
