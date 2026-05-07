# Validation Summary: How to Add Subnets to an Azure VNet with Specific IPv4 CIDR Blocks

## Status
validated

## Post Type
Guide

## Technologies Covered
- Azure Virtual Network (VNet)
- Azure CLI
- Azure subnets and IPv4 CIDR addressing
- Azure subnet delegation
- Azure service endpoints
- Azure VPN Gateway / ExpressRoute gateway subnets
- Azure Kubernetes Service (AKS)
- Azure App Service Environment

## Sources Consulted
- Azure CLI reference for `az network vnet subnet`: https://learn.microsoft.com/en-us/cli/azure/network/vnet/subnet?view=azure-cli-latest
- Add, change, or delete a subnet: https://learn.microsoft.com/en-us/azure/virtual-network/virtual-network-manage-subnet
- Azure Virtual Network FAQ: https://learn.microsoft.com/en-us/azure/virtual-network/virtual-networks-faq
- Private IP addresses in Azure: https://learn.microsoft.com/azure/virtual-network/ip-services/private-ip-addresses
- Troubleshoot subnet deletion and modification failures in Azure Virtual Network: https://learn.microsoft.com/en-us/troubleshoot/azure/virtual-network/virtual-network-troubleshoot-cannot-delete-modify-subnet
- Azure VPN Gateway configuration settings: https://learn.microsoft.com/en-us/azure/vpn-gateway/vpn-gateway-about-vpn-gateway-settings
- App Service Environment networking: https://learn.microsoft.com/en-gb/azure/app-service/environment/networking
- What is subnet delegation?: https://learn.microsoft.com/en-us/azure/virtual-network/subnet-delegation-overview
- Add or remove subnet delegation in Azure virtual network: https://learn.microsoft.com/en-us/azure/virtual-network/manage-subnet-delegation
- Create, change, or delete an Azure virtual network: https://learn.microsoft.com/en-us/azure/virtual-network/manage-virtual-network
- Troubleshoot the SubnetIsDelegated error code: https://learn.microsoft.com/en-us/troubleshoot/azure/azure-kubernetes/error-codes/subnetisdelegated-error

## Issues Found
- The post used `--address-prefix` in subnet create and update commands. I changed these to the current documented Azure CLI flag, `--address-prefixes`, because that is the syntax shown in the current CLI reference.
- The subnet listing example labeled `ipConfigurations` as `Available`, which was misleading because `ipConfigurations` represents attached IP configurations rather than available IP addresses. I removed that column and kept the example focused on subnet names and CIDR blocks.
- The reserved-address table implied the last reserved address is always `x.x.x.255`, which is only true for some subnet sizes such as `/24`. I changed it to "Last IP in the subnet range" to make the guidance correct for any subnet size.
- The delegation explanation said delegation assigns a subnet exclusively to an Azure service. I changed that line to say delegation gives an Azure service explicit permission to use a subnet, which matches Microsoft’s current delegation documentation more accurately.
- The gateway subnet sizing note said `/29` is the minimum generally. I corrected it to state that `/27` or larger is the normal requirement and `/29` is only applicable to the Basic SKU, per current VPN Gateway guidance.
- The resize section said a subnet must be empty before its address range can be changed. I updated that note to reflect current Microsoft guidance that resizing can succeed when the new range still contains all assigned IP addresses.

## Review Notes
The post is now technically accurate for current Azure CLI and Microsoft Learn guidance. The examples assume single-prefix IPv4 subnets; that matches the scope of the article even though Azure subnet resources can also expose `addressPrefixes` for multi-prefix scenarios.
