# Validation Summary: How to Set Up Azure Private Link Service for Exposing Internal Apps to Other

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Private Link Service
- Azure Private Endpoint
- Azure Standard Load Balancer
- Azure Virtual Network and subnets
- Azure Private DNS
- Azure CLI
- TCP Proxy Protocol v2

## Sources Consulted
- Azure Private Link Service overview: https://learn.microsoft.com/en-us/azure/private-link/private-link-service-overview
- Azure Private Endpoint overview: https://learn.microsoft.com/en-us/azure/private-link/private-endpoint-overview
- Azure CLI quickstart for Private Link Service: https://learn.microsoft.com/en-ca/azure/private-link/create-private-link-service-cli
- Azure CLI reference for `az network private-link-service`: https://learn.microsoft.com/en-us/cli/azure/network/private-link-service
- Azure CLI reference for `az network private-link-service connection`: https://learn.microsoft.com/en-us/cli/azure/network/private-link-service/connection
- Azure CLI reference for `az network private-endpoint`: https://learn.microsoft.com/en-us/cli/azure/network/private-endpoint
- Azure CLI reference for `az network vnet subnet`: https://learn.microsoft.com/en-us/cli/azure/network/vnet/subnet
- ARM/Bicep reference for `Microsoft.Network/privateLinkServices`: https://learn.microsoft.com/en-us/azure/templates/microsoft.network/privatelinkservices
- Azure Private Link FAQ: https://learn.microsoft.com/en-us/azure/private-link/private-link-faq

## Issues Found
- The prerequisites did not mention that Private Link Service is supported only with Standard Load Balancer backend pools configured by NIC, not by IP address. Added that requirement.
- The post treated a dedicated NAT subnet as an Azure requirement. Reworded it to say that Private Link Service needs a NAT subnet and that dedicating the subnet is an operational best practice, not a platform requirement.
- The subnet example used the older `--disable-private-link-service-network-policies true` flag. Replaced it with the current `--private-link-service-network-policies Disabled` form.
- The explanation for disabling Private Link Service network policies incorrectly implied that NSG and UDR policies generally interfere with NAT. Reworded it to match Microsoft guidance that this setting affects Private Link Service network policies while other subnet resources remain controlled by NSG rules.
- The first consumer private endpoint example was labeled as using the alias but actually used the Private Link Service resource ID. Corrected the comment.
- The alias-based private endpoint example used `--manual-request` without an explicit value. Updated it to `--manual-request true`, matching the documented requirement for alias-based manual connection requests.
- The private endpoint IP lookup used `customDnsConfigurations[0].ipAddresses[0]`, which is not reliable for custom Private Link Services. Updated it to expand the private endpoint network interface and query `networkInterfaces[0].ipConfigurations[0].privateIpAddress`.
- The NAT scaling section said each NAT IP supports 64,000 connections. Corrected this to 64,000 TCP connections per VM behind the Standard Load Balancer.
- The NAT IP update example used a non-existent `--ip-configs` option for `az network private-link-service update`. Replaced it with the documented generic `--add ipConfigurations` approach using the ARM property shape.

## Review Notes
The local environment did not have Azure CLI installed, so CLI validation was performed against current Microsoft Learn CLI reference pages rather than local `az --help` output.
