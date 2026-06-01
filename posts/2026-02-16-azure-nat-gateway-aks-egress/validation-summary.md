# Validation Summary: How to Configure Azure NAT Gateway for Azure Kubernetes Service Egress

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Kubernetes Service (AKS)
- Azure NAT Gateway
- Azure Virtual Network and subnets
- Azure Standard Load Balancer egress
- Azure CLI
- Kubernetes kubectl
- Azure Monitor metrics and alerts
- SNAT and outbound connectivity

## Sources Consulted
- Microsoft Learn: Create a managed or user-assigned NAT gateway for your Azure Kubernetes Service (AKS) cluster - https://learn.microsoft.com/en-us/azure/aks/nat-gateway
- Microsoft Learn: Customize cluster egress with outbound types in Azure Kubernetes Service (AKS) - https://learn.microsoft.com/en-us/azure/aks/egress-outboundtype
- Microsoft Learn: Source Network Address Translation (SNAT) with Azure NAT Gateway - https://learn.microsoft.com/en-us/azure/nat-gateway/nat-gateway-snat
- Microsoft Learn: Manage a NAT gateway - https://learn.microsoft.com/en-us/azure/nat-gateway/manage-nat-gateway
- Microsoft Learn: Metrics and alerts for Azure NAT Gateway - https://learn.microsoft.com/en-us/azure/nat-gateway/nat-metrics
- Microsoft Learn: Azure Virtual Network FAQ - https://learn.microsoft.com/en-us/azure/virtual-network/virtual-networks-faq
- Microsoft Learn: Azure CLI az network nat gateway reference - https://learn.microsoft.com/en-us/cli/azure/network/nat/gateway
- Microsoft Learn: Azure CLI az aks reference - https://learn.microsoft.com/en-us/cli/azure/aks

## Issues Found
- The post said a /20 Azure subnet provides 4,094 usable IPs. Azure reserves five IP addresses in each subnet, so a /20 provides 4,091 usable IPs. Updated the subnet sizing explanation.
- The monitoring examples used `DroppedPacketCount`, but the Azure NAT Gateway metric name is `PacketDropCount`. Updated both the metrics query and alert condition.
- The post described dropped packets as directly indicating port exhaustion and labeled the alert as an SNAT failure alert. Microsoft documents dropped packets as a signal that can help diagnose failed outbound connections or SNAT exhaustion, while SNAT failures are tracked through `SNATConnectionCount` with connection state filtering. Updated the wording to avoid overstating the signal.

## Review Notes
The Azure CLI binary was not installed in the local environment, so command verification was performed against current Microsoft Learn Azure CLI reference pages and AKS/NAT Gateway documentation rather than local `az --help` output.
