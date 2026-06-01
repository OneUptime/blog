# Validation Summary: How to Configure AKS with Azure Virtual Network Peering for Cross-VNet Pod

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Kubernetes Service (AKS)
- Azure CNI Node Subnet and Azure CNI Pod Subnet networking
- Azure CNI Overlay and kubenet networking caveats
- Azure Virtual Network peering
- Azure CLI
- Kubernetes Services and internal Azure Load Balancer
- Azure Private DNS
- Network Security Groups

## Sources Consulted
- Microsoft Learn: Azure virtual network peering overview: https://learn.microsoft.com/en-us/azure/virtual-network/virtual-network-peering-overview
- Microsoft Learn: Create, change, or delete Azure virtual network peering: https://learn.microsoft.com/en-us/azure/virtual-network/virtual-network-manage-peering
- Microsoft Learn: Azure Kubernetes Service CNI networking overview: https://learn.microsoft.com/en-us/azure/aks/concepts-network-cni-overview
- Microsoft Learn: Configure Azure CNI networking in AKS: https://learn.microsoft.com/en-us/azure/aks/configure-azure-cni
- Microsoft Learn: Configure Azure CNI Overlay networking in AKS: https://learn.microsoft.com/en-us/azure/aks/azure-cni-overlay
- Microsoft Learn: Configure kubenet networking in AKS: https://learn.microsoft.com/en-us/azure/aks/configure-kubenet
- Microsoft Learn: Create an internal load balancer in AKS: https://learn.microsoft.com/en-us/azure/aks/internal-lb
- Microsoft Learn: Azure Private DNS zone overview: https://learn.microsoft.com/en-us/azure/dns/private-dns-privatednszone
- Microsoft Learn: Azure Private DNS virtual network links: https://learn.microsoft.com/en-us/azure/dns/private-dns-virtual-network-links
- Microsoft Learn Azure CLI reference: az network vnet peering: https://learn.microsoft.com/en-us/cli/azure/network/vnet/peering

## Issues Found
- The post described Azure CNI broadly as always assigning pod IPs from the VNet subnet. Updated the wording to specify Azure CNI flat networking modes, specifically Azure CNI Node Subnet and Azure CNI Pod Subnet, because Azure CNI Overlay assigns pod IPs from a separate overlay CIDR.
- The prerequisites implied any Azure CNI cluster was suitable for direct cross-VNet pod IP reachability. Updated this to exclude kubenet and Azure CNI Overlay for direct pod IP reachability from peered VNets.
- The AKS creation comment did not identify that `--network-plugin azure` without overlay mode creates Azure CNI Node Subnet mode. Updated the comment for clarity.
- The cluster-to-cluster service guidance referred to services with external IPs, then showed an internal load balancer. Updated the sentence to say Kubernetes LoadBalancer services, preferably internal load balancers for private cross-VNet access.
- The hub-and-spoke section implied VNet peering automatically routes spoke-to-spoke traffic through the hub. Updated it to state that VNet peering is not transitive and that hub-routed spoke-to-spoke traffic requires an NVA, Azure Firewall, or gateway transit where appropriate.
- The troubleshooting section said Azure CNI Overlay needs UDRs to route pod traffic. Updated it to reflect official behavior: overlay pod IPs are not directly reachable from peered VNets, outbound traffic is SNAT'd to node IPs, and inbound access should use a Kubernetes service such as a load balancer.

## Review Notes
The Azure CLI and kubectl binaries were not installed in the local workspace, so command validation was performed against Microsoft Learn command references rather than local `--help` output. The documented Azure CLI command shapes and flags used in the post are current and plausible.
