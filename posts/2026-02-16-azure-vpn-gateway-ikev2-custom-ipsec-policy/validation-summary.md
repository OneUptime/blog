# Validation Summary: How to Set Up Azure VPN Gateway with IKEv2 Custom IPsec Policy

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure VPN Gateway
- Azure CLI
- Site-to-Site VPN
- IKEv2
- IPsec/IKE custom policies
- Azure Network Watcher VPN diagnostics
- Cisco IOS IPsec configuration

## Sources Consulted
- Microsoft Learn: Configure custom IPsec/IKE connection policies for S2S VPN and VNet-to-VNet connections: https://learn.microsoft.com/en-us/azure/vpn-gateway/ipsec-ike-policy-howto
- Microsoft Learn: az network vnet-gateway CLI reference: https://learn.microsoft.com/en-us/cli/azure/network/vnet-gateway?view=azure-cli-latest
- Microsoft Learn: az network local-gateway CLI reference: https://learn.microsoft.com/en-us/cli/azure/network/local-gateway?view=azure-cli-latest
- Microsoft Learn: az network vpn-connection CLI reference: https://learn.microsoft.com/en-us/cli/azure/network/vpn-connection?view=azure-cli-latest
- Microsoft Learn: az network vpn-connection ipsec-policy CLI reference: https://learn.microsoft.com/en-us/cli/azure/network/vpn-connection/ipsec-policy?view=azure-cli-latest
- Microsoft Learn: az network watcher troubleshooting CLI reference: https://learn.microsoft.com/en-us/cli/azure/network/watcher/troubleshooting?view=azure-cli-latest
- IETF RFC 7296: Internet Key Exchange Protocol Version 2 (IKEv2): https://datatracker.ietf.org/doc/rfc7296/

## Issues Found
- The VPN gateway creation command used `--generation Generation2`, but the current Azure CLI parameter is `--vpn-gateway-generation Generation2`. Updated the command to use the documented parameter.
- The workflow used `--no-wait` for gateway creation and then immediately proceeded toward connection creation. Added `az network vnet-gateway wait --created` so the connection step does not run before the gateway is provisioned.
- The VPN connection command explicitly passed `--enable-bgp false`. BGP is disabled by default for this command, and current CLI examples only require the flag when enabling BGP, so the unnecessary argument was removed.
- The supported algorithm list did not match the Azure VPN Gateway custom IPsec/IKE policy documentation. Updated IKE encryption, DH group, and PFS group values to align with the documented S2S/VNet-to-VNet policy options.
- The post implied all settings must exactly match, including SA lifetimes. Azure documents SA lifetimes as local specifications that do not need to match exactly, so the wording now says cryptographic proposals must be compatible and lifetimes can differ.
- The `--sa-lifetime` explanation was ambiguous. Clarified that it configures the IPsec/Quick Mode SA lifetime, while Azure VPN Gateway IKE Main Mode SA lifetime is fixed at 28,800 seconds.
- The Network Watcher troubleshooting command used `--resource-type vpnGateway`, but the Azure CLI accepts `vnetGateway` or `vpnConnection`. Updated the command to `--resource-type vnetGateway`.
- The introductory IKEv2 wording described negotiation as phases without context. Adjusted it to describe Azure's policy grouping while keeping the IKEv2 exchange diagram intact.

## Review Notes
- The Azure CLI was not installed in the local environment, so command validation was performed against current official Microsoft Learn CLI documentation rather than local `az --help` output.
- The Network Watcher troubleshooting example assumes the referenced storage account and blob container already exist.
