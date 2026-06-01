# Validation Summary: How to Configure Network Security Group Rules to Allow Specific Traffic in Azure

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Microsoft Azure
- Azure Network Security Groups
- Azure CLI
- Azure Virtual Network subnets and network interfaces
- Azure service tags
- Azure Application Security Groups
- Azure Network Watcher effective security rules

## Sources Consulted
- Azure network security groups overview: https://learn.microsoft.com/en-us/azure/architecture/networking/guide/network-level-segmentation
- How network security groups filter network traffic: https://learn.microsoft.com/en-us/azure/virtual-network/network-security-group-how-it-works
- Azure service tags overview: https://learn.microsoft.com/en-us/azure/virtual-network/service-tags-overview
- Azure CLI `az network nsg rule`: https://learn.microsoft.com/en-us/cli/azure/network/nsg/rule?view=azure-cli-latest
- Azure CLI `az network vnet subnet`: https://learn.microsoft.com/en-us/cli/azure/network/vnet/subnet?view=azure-cli-latest
- Azure CLI `az network nic`: https://learn.microsoft.com/en-us/cli/azure/network/nic?view=azure-cli-latest
- Azure CLI `az network nic ip-config`: https://learn.microsoft.com/en-us/cli/azure/network/nic/ip-config?view=azure-cli-latest
- Effective security rules overview: https://learn.microsoft.com/en-us/azure/network-watcher/network-watcher-security-group-view-overview

## Issues Found
- The default NSG rule description omitted the default inbound `AzureLoadBalancer` allow rule. Updated the description to include Azure Load Balancer health probes.
- The post stated that no custom inbound traffic is allowed after NSG creation. Clarified that no custom inbound internet traffic is allowed, because default inbound rules still allow `VirtualNetwork` and `AzureLoadBalancer` traffic.
- The explicit deny-all inbound guidance did not mention that a custom priority 4000 deny rule is evaluated before Azure's default inbound rules at priorities 65000 and 65001. Added a note that required VNet or load balancer allow rules must be added above it.
- The `Internet` and `VirtualNetwork` service tag descriptions were oversimplified. Updated them to match Microsoft Learn's current definitions more closely.

## Review Notes
The Azure CLI examples use current command groups and parameters according to Microsoft Learn. Azure CLI was not installed in the local environment, so CLI verification was performed against official Azure CLI documentation rather than local `az --help` output.
