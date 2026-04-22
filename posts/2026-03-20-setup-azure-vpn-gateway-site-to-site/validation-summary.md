# Validation Summary: How to Set Up Azure VPN Gateway for Site-to-Site IPv4 Connectivity

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure VPN Gateway
- Azure Virtual Network Gateway
- Azure GatewaySubnet
- Azure Public IP
- Azure Local Network Gateway
- Azure CLI
- Site-to-site IPsec/IKE VPN
- Custom IPsec/IKE policies

## Sources Consulted
- Microsoft Learn: Create a VPN gateway using CLI - https://learn.microsoft.com/en-us/azure/vpn-gateway/create-routebased-vpn-gateway-cli
- Microsoft Learn: Create a site-to-site VPN connection - Azure CLI - https://learn.microsoft.com/en-us/azure/vpn-gateway/vpn-gateway-howto-site-to-site-resource-manager-cli
- Microsoft Learn: VPN Gateway SKU consolidation and migration - https://learn.microsoft.com/en-us/azure/vpn-gateway/gateway-sku-consolidation
- Microsoft Learn: About gateway SKUs - https://learn.microsoft.com/en-us/azure/vpn-gateway/about-gateway-skus
- Microsoft Learn: About VPN devices for connections - https://learn.microsoft.com/en-us/azure/vpn-gateway/vpn-gateway-third-party-settings
- Microsoft Learn: Configure custom IPsec/IKE connection policies - https://learn.microsoft.com/en-us/azure/vpn-gateway/ipsec-ike-policy-howto
- Azure CLI reference: az network vnet-gateway - https://learn.microsoft.com/en-us/cli/azure/network/vnet-gateway
- Azure CLI reference: az network vpn-connection - https://learn.microsoft.com/en-us/cli/azure/network/vpn-connection
- Azure CLI reference: az network vpn-connection ipsec-policy - https://learn.microsoft.com/en-us/cli/azure/network/vpn-connection/ipsec-policy
- Azure CLI reference: az network vnet subnet - https://learn.microsoft.com/en-us/cli/azure/network/vnet/subnet
- Azure CLI reference: az network public-ip - https://learn.microsoft.com/en-us/cli/azure/network/public-ip
- Azure CLI reference: az network local-gateway - https://learn.microsoft.com/en-us/cli/azure/network/local-gateway

## Issues Found
- The VPN gateway example used the non-AZ `VpnGw1` SKU. Microsoft states that, effective November 1, 2025, new non-AZ `VpnGw1-5` VPN gateways can no longer be created. Changed the example to `VpnGw1AZ` and added a note to the SKU comparison.
- The public IP example did not specify zones, which is required for AZ gateway SKUs. Added `--zone 1 2 3` for the Standard static public IP in `eastus`.
- The VPN gateway creation timing was listed as 25-45 minutes and approximately 30 minutes. Microsoft documentation says gateway creation can often take 45 minutes or more. Updated the timing language.
- The site-to-site connection command used `--connection-type IPSec`, which is not a current `az network vpn-connection create` parameter. Removed the flag; the connection is created as IPsec when `--local-gateway2` is supplied.
- The GatewaySubnet command used `--address-prefix`. Updated it to the current `--address-prefixes` parameter from the Azure CLI reference.
- The conclusion described RouteBased as `RouteBased (IKEv2)`. Current Azure documentation states route-based VpnGw SKUs support IKEv1 and IKEv2, with IKEv2 used by default where applicable. Updated the wording.
- Normalized `IPSec` casing to `IPsec` in the post text.

## Review Notes
- The `--sa-max-size 1024` value in the custom IPsec/IKE policy is valid because it is the documented minimum, but it is much lower than Azure's default and official CLI examples. Consider documenting the reason for that low value if this is intended for production use.
- The Azure CLI was not installed in the local environment, so command syntax was verified against current Microsoft Learn CLI references.
