# Validation Summary: How to Set Up Hybrid Connectivity Between On-Premises and Azure

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure VPN Gateway
- Azure CLI
- Site-to-Site VPN
- IPsec/IKE
- BGP
- Azure Monitor
- Log Analytics

## Sources Consulted
- Azure VPN Gateway overview and SKU table: https://learn.microsoft.com/en-us/azure/vpn-gateway/vpn-gateway-about-vpngateways
- Azure VPN Gateway SKU details and per-tunnel performance: https://learn.microsoft.com/en-us/azure/vpn-gateway/about-gateway-skus
- Create a route-based VPN gateway with Azure CLI: https://learn.microsoft.com/en-us/azure/vpn-gateway/create-routebased-vpn-gateway-cli
- Azure CLI reference for `az network vnet-gateway`: https://learn.microsoft.com/en-us/cli/azure/network/vnet-gateway
- Azure CLI reference for `az network local-gateway`: https://learn.microsoft.com/en-us/cli/azure/network/local-gateway
- Azure CLI reference for `az network vpn-connection`: https://learn.microsoft.com/en-us/cli/azure/network/vpn-connection
- Azure CLI reference for `az network vpn-connection ipsec-policy`: https://learn.microsoft.com/en-us/cli/azure/network/vpn-connection/ipsec-policy
- Configure custom IPsec/IKE policies for Azure VPN Gateway: https://learn.microsoft.com/en-us/azure/vpn-gateway/ipsec-ike-policy-howto
- About active-active VPN gateways: https://learn.microsoft.com/en-us/azure/vpn-gateway/about-active-active-gateways
- Azure VPN Gateway monitoring data reference: https://learn.microsoft.com/en-us/azure/vpn-gateway/monitor-vpn-gateway-reference
- Azure Monitor supported metrics for `microsoft.network/virtualnetworkgateways`: https://learn.microsoft.com/en-us/azure/azure-monitor/reference/supported-metrics/microsoft-network-virtualnetworkgateways-metrics
- Azure CLI reference for metric alerts: https://learn.microsoft.com/en-us/cli/azure/monitor/metrics/alert

## Issues Found
- The VPN Gateway SKU table mixed Generation1 and Generation2 throughput values. Updated the table to include the gateway generation and current aggregate throughput/P2S values for the listed SKUs.
- The VPN gateway creation command used `--generation Generation2`, which is not a valid `az network vnet-gateway create` option. Replaced it with `--vpn-gateway-generation Generation2`.
- The VPN connection creation command used `--connection-protocol IKEv2`, which is not supported by `az network vpn-connection create` for virtual network gateway connections. Removed the flag and noted that IKEv2 is the default where applicable.
- The custom IPsec policy used `--sa-max-size 1024`, the minimum value, instead of the documented default-style value commonly used in examples. Updated it to `102400000`.
- The generated device configuration script example used generic Cisco ASA values. Replaced them with the documented Cisco ISR example values from the Azure CLI reference.
- The active-active section incorrectly described a single VPN gateway instance as the default single point of failure. Updated it to reflect that Azure VPN gateways use two active-standby instances by default and active-active mode makes both instances establish tunnels.
- The troubleshooting text implied the Azure connection protocol can simply be changed after creation. Updated it to state that the connection must be recreated with the required protocol type using a supported Azure tool.
- The diagnostics command referenced a Log Analytics workspace that had not been created. Added the workspace creation command before enabling diagnostic settings.
- The metric alert example scoped `TunnelAverageBandwidth` to the VPN connection resource and used `--action-group`. Updated the scope to the virtual network gateway resource and changed the option to `--action`.

## Review Notes
Azure CLI was not installed in the local environment, so CLI validation was performed against official Microsoft Learn CLI references rather than local `az --help` output.
