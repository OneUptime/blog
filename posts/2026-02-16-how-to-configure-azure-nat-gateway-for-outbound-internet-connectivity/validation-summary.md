# Validation Summary: How to Configure Azure NAT Gateway for Outbound Internet Connectivity

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure NAT Gateway
- Azure Virtual Network and subnets
- Azure public IP addresses and public IP prefixes
- Azure CLI
- Source Network Address Translation (SNAT)
- Azure Load Balancer outbound connectivity
- Default outbound access in Azure

## Sources Consulted
- Microsoft Learn: What is Azure NAT Gateway? https://learn.microsoft.com/en-us/azure/nat-gateway/nat-overview
- Microsoft Learn: Source Network Address Translation (SNAT) with Azure NAT Gateway https://learn.microsoft.com/en-us/azure/nat-gateway/nat-gateway-snat
- Microsoft Learn: Manage a NAT gateway https://learn.microsoft.com/en-us/azure/nat-gateway/manage-nat-gateway
- Microsoft Learn: Troubleshoot Azure NAT Gateway https://learn.microsoft.com/en-us/troubleshoot/azure/nat-gateway/troubleshoot-nat
- Microsoft Learn: Default outbound access in Azure https://learn.microsoft.com/en-us/azure/virtual-network/ip-services/default-outbound-access
- Microsoft Learn: Azure CLI reference for az network nat gateway https://learn.microsoft.com/en-us/cli/azure/network/nat/gateway
- Microsoft Learn: Azure CLI reference for az network public-ip https://learn.microsoft.com/en-us/cli/azure/network/public-ip
- Microsoft Learn: Azure CLI reference for az vm create https://learn.microsoft.com/en-us/cli/azure/vm
- Microsoft Learn: Source Network Address Translation (SNAT) for outbound connections with Azure Load Balancer https://learn.microsoft.com/en-us/azure/load-balancer/load-balancer-outbound-connections

## Issues Found
- The post repeatedly stated that NAT Gateway provides 64,000 SNAT ports per public IP. Microsoft documents 64,512 SNAT ports per NAT Gateway public IP, so the port counts were updated throughout the article.
- The post described NAT Gateway as eliminating SNAT exhaustion. NAT Gateway dynamically allocates SNAT ports and reduces the risk, but exhaustion can still occur if available ports are exceeded, so those claims were softened.
- The public IP prefix example omitted `--sku Standard`. NAT Gateway requires compatible Standard public IP addresses or prefixes for Standard NAT Gateway, so the example was updated.
- The /30 public IP prefix and two-public-IP totals were based on 64,000 ports per IP. They were updated to 258,048 and 129,024 SNAT ports respectively.
- The troubleshooting section incorrectly said VM public IPs and load balancer outbound rules take precedence over NAT Gateway. Microsoft documents NAT Gateway as taking precedence for new outbound connections, while UDRs to a virtual appliance or virtual network gateway can override NAT Gateway. The troubleshooting guidance was corrected.
- The Load Balancer SNAT comparison implied all Standard Load Balancer SNAT is simply divided equally. It was narrowed to Standard Load Balancer outbound rules and preallocated ports.

## Review Notes
Azure CLI is not installed in the local workspace, so CLI syntax was validated against the current Microsoft Learn Azure CLI reference rather than local `az --help` output. The post uses Standard NAT Gateway examples; Microsoft now also documents StandardV2 NAT Gateway for zone-redundant and IPv6 scenarios, which could be mentioned in a future update if the article expands beyond the basic Standard SKU walkthrough.
