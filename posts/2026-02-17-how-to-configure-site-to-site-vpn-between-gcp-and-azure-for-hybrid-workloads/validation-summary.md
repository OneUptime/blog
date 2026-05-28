# Validation Summary: How to Configure Site-to-Site VPN Between GCP and Azure for Hybrid Workloads

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud HA VPN
- Google Cloud Router and BGP
- Google Cloud SDK / gcloud CLI
- Microsoft Azure VPN Gateway
- Azure Virtual Network and local network gateway
- Azure CLI
- IPsec/IKEv2 site-to-site VPN

## Sources Consulted
- Google Cloud: Create HA VPN connections between Google Cloud and Azure: https://docs.cloud.google.com/network-connectivity/docs/vpn/tutorials/create-ha-vpn-connections-google-cloud-azure
- Google Cloud SDK: gcloud compute vpn-gateways create: https://docs.cloud.google.com/sdk/gcloud/reference/compute/vpn-gateways/create
- Google Cloud SDK: gcloud compute external-vpn-gateways create: https://docs.cloud.google.com/sdk/gcloud/reference/compute/external-vpn-gateways/create
- Google Cloud SDK: gcloud compute vpn-tunnels create: https://docs.cloud.google.com/sdk/gcloud/reference/compute/vpn-tunnels/create
- Microsoft Learn: az network vnet-gateway CLI reference: https://learn.microsoft.com/en-us/cli/azure/network/vnet-gateway
- Microsoft Learn: About active-active mode VPN gateways: https://learn.microsoft.com/en-us/azure/vpn-gateway/about-active-active-gateways
- Microsoft Learn: Configure BGP for Azure VPN Gateway: https://learn.microsoft.com/en-us/azure/vpn-gateway/bgp-howto
- Microsoft Learn: Configure a site-to-site VPN connection using Azure CLI: https://learn.microsoft.com/en-us/azure/vpn-gateway/site-to-site-ipv6-azure-cli
- Microsoft Learn: Azure VPN Gateway FAQ: https://learn.microsoft.com/en-us/azure/vpn-gateway/vpn-gateway-vpn-faq

## Issues Found
- The Azure VPN Gateway command used `--generation`, which is not the current Azure CLI flag for VPN Gateway generation. Changed it to `--vpn-gateway-generation Generation2`.
- The Azure VPN Gateway command used the singular public IP flag while passing two IP resources. Changed it to `--public-ip-addresses azure-vpn-ip-1 azure-vpn-ip-2`, matching the Azure CLI active-active gateway syntax.
- The GCP external VPN gateway command split the `--interfaces` value across lines in a way that can be parsed as separate shell arguments. Changed it to `--interfaces=0=AZURE_VPN_IP_1,1=AZURE_VPN_IP_2`.
- The BGP examples assigned GCP and Azure APIPA addresses inconsistently with Azure active-active VPN Gateway requirements. Added the Azure custom APIPA BGP address requirement and aligned GCP Cloud Router peers and Azure local network gateway peer addresses to `169.254.21.1/169.254.21.2` and `169.254.22.1/169.254.22.2`.
- The redundancy claim said traffic automatically fails over to the other tunnel. Azure active-active gateways can use both tunnels simultaneously, so the wording was changed to say traffic can continue over the remaining tunnel.

## Review Notes
The Azure CLI can create the active-active VPN Gateway resources, but configuring the custom Azure APIPA BGP addresses for active-active gateways is clearer and better documented in the Azure portal and ARM model than in the basic CLI create example. The post now calls out this required Azure-side configuration explicitly.
