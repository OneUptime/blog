# Validation Summary: How to Configure AKS Cluster with Azure CNI Overlay Networking

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Kubernetes Service (AKS)
- Azure CNI Overlay networking
- Azure CLI
- Kubernetes NetworkPolicy
- Azure service endpoints
- Azure Private Link and Private DNS
- Azure Load Balancer
- Azure Monitor and Network Watcher

## Sources Consulted
- Microsoft Learn: Configure Azure CNI Overlay networking in AKS - https://learn.microsoft.com/en-us/azure/aks/azure-cni-overlay
- Microsoft Learn: Overview of Azure CNI Overlay networking in AKS - https://learn.microsoft.com/en-us/azure/aks/concepts-network-azure-cni-overlay
- Microsoft Learn: Azure CLI `az aks create` reference - https://learn.microsoft.com/en-us/cli/azure/aks
- Microsoft Learn: Azure CLI `az network private-endpoint create` reference - https://learn.microsoft.com/en-us/cli/azure/network/private-endpoint
- Microsoft Learn: Azure CLI `az network private-endpoint dns-zone-group create` reference - https://learn.microsoft.com/en-us/cli/azure/network/private-endpoint/dns-zone-group
- Microsoft Learn: Azure Private Endpoint private DNS zone values - https://learn.microsoft.com/en-us/azure/private-link/private-endpoint-dns
- Microsoft Learn: AKS monitoring data reference - https://learn.microsoft.com/en-us/azure/aks/monitor-aks-reference
- Microsoft Learn: Connect to AKS cluster nodes for maintenance or troubleshooting - https://learn.microsoft.com/en-us/azure/aks/node-access
- Microsoft Learn: Azure CLI `az network watcher packet-capture` reference - https://learn.microsoft.com/en-us/cli/azure/network/watcher/packet-capture

## Issues Found
- The post implied Azure CNI Overlay supports the same features as traditional Azure CNI. Updated the wording to say it supports common Azure networking features and clarified that external endpoints cannot directly reach pods without a Service or ingress path.
- The CIDR conflict checklist incorrectly listed Azure service endpoints as an address range. Replaced it with other pod or service CIDR ranges.
- The NetworkPolicy allowed DNS egress only over TCP. Added UDP port 53, which is required for normal DNS queries.
- The service endpoint examples used separate subnet updates, which can unintentionally replace the previous endpoint list. Combined Storage and SQL service endpoints into one update command.
- The private endpoint DNS steps created and linked a private DNS zone but did not associate it with the private endpoint. Added `az network private-endpoint dns-zone-group create`.
- The Azure Monitor Kusto sample used unverified Container Insights counter names. Replaced it with documented AKS platform metric names for node network ingress and egress bytes and noted the need to export platform metrics to Log Analytics.
- The Network Watcher packet capture example targeted an AKS VMSS instance as if it were a standalone VM in the cluster resource group. Updated it to use the AKS node resource group and VMSS target type.
- The node route troubleshooting command used `az vm run-command` against a Kubernetes node name. Replaced it with the AKS-supported `kubectl debug node/...` pattern.

## Review Notes
The Azure CLI was not available in the local environment, so CLI flags and examples were checked against Microsoft Learn command references rather than local `az --help` output.
