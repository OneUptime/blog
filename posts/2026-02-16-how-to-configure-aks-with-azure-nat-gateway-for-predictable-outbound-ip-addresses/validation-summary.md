# Validation Summary: How to Configure AKS with Azure NAT Gateway

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Kubernetes Service (AKS)
- Azure NAT Gateway
- Azure public IP addresses and public IP prefixes
- Azure Virtual Network and subnets
- Azure CLI
- Kubernetes `kubectl`
- Azure Monitor metrics and alerts

## Sources Consulted
- Microsoft Learn: Customize cluster egress with outbound types in Azure Kubernetes Service (AKS) - https://learn.microsoft.com/en-us/azure/aks/egress-outboundtype
- Microsoft Learn: Configure a public standard load balancer in Azure Kubernetes Service (AKS) - https://learn.microsoft.com/en-us/azure/aks/configure-load-balancer-standard
- Microsoft Learn: What is Azure NAT Gateway? - https://learn.microsoft.com/en-us/azure/nat-gateway/nat-overview
- Microsoft Learn: Manage a NAT gateway - https://learn.microsoft.com/en-us/azure/nat-gateway/manage-nat-gateway
- Microsoft Learn: Troubleshoot Azure NAT Gateway - https://learn.microsoft.com/en-us/troubleshoot/azure/nat-gateway/troubleshoot-nat
- Microsoft Learn: Source Network Address Translation (SNAT) with Azure NAT Gateway - https://learn.microsoft.com/en-us/azure/nat-gateway/nat-gateway-snat
- Microsoft Learn: Metrics and alerts for Azure NAT Gateway - https://learn.microsoft.com/en-us/azure/nat-gateway/nat-metrics
- Microsoft Learn: Supported metrics for Microsoft.Network/natgateways - https://learn.microsoft.com/en-us/azure/azure-monitor/reference/supported-metrics/microsoft-network-natgateways-metrics
- Microsoft Learn Azure CLI reference: `az network nat gateway` - https://learn.microsoft.com/en-us/cli/azure/network/nat/gateway
- Microsoft Learn Azure CLI reference: `az network public-ip prefix` - https://learn.microsoft.com/en-us/cli/azure/network/public-ip/prefix
- Microsoft Learn Azure CLI reference: `az monitor metrics` - https://learn.microsoft.com/en-us/cli/azure/monitor/metrics
- Microsoft Learn Azure CLI reference: `az monitor metrics alert` - https://learn.microsoft.com/en-us/cli/azure/monitor/metrics/alert

## Issues Found
- The NAT Gateway creation command referenced `aks-outbound-ip-2` even though the second public IP was introduced as optional. Changed the command to attach `aks-outbound-ip-1` by default and added a note to include additional public IPs only if they were created.
- The verification section said every run should return the same IP address. With multiple public IPs or a prefix attached to NAT Gateway, outbound traffic can use any IP from the configured set. Updated the wording to say a single attached IP should remain consistent, while multiple IPs require allowlisting the full set.
- The multiple-subnet section said subnets could share one NAT Gateway via VNet peering. Azure NAT Gateway can attach to multiple subnets only within the same virtual network and cannot span VNets through peering. Updated the explanation.
- The monitoring examples used a non-existent `DroppedConnectionCount` NAT Gateway metric. Replaced it with the documented `SNATConnectionCount` metric filtered to `ConnectionState eq 'Failed'`, and updated the alert example accordingly.
- The default load balancer discussion implied ordinary cluster upgrades and node pool scale operations directly change outbound IPs. Adjusted the list to focus on documented AKS-managed outbound IP changes and reconciliation behavior.

## Review Notes
The Azure CLI binary was not installed in the local environment, so command validation was performed against Microsoft Learn CLI references rather than local `az --help` output. Pricing values are region and agreement dependent; the post's approximate cost language is acceptable but should be rechecked before publication if exact pricing matters.
