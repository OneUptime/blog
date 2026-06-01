# Validation Summary: Configure AKS with Azure CNI Dynamic IP Allocation for Large-Scale Clusters

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Kubernetes Service (AKS)
- Azure CNI Pod Subnet dynamic IP allocation
- Azure CLI
- Azure Virtual Network and subnets
- Kubernetes kubectl
- Azure Network Security Groups
- Azure Monitor / Container Insights

## Sources Consulted
- Microsoft Learn: Configure Azure CNI Pod Subnet - Dynamic IP Allocation and enhanced subnet support in AKS, https://learn.microsoft.com/en-us/azure/aks/configure-azure-cni-dynamic-ip-allocation
- Microsoft Learn: Azure CNI networking in AKS, https://learn.microsoft.com/en-us/azure/aks/configure-azure-cni
- Microsoft Learn: Azure CNI Overlay networking in AKS, https://learn.microsoft.com/en-us/azure/aks/azure-cni-overlay
- Microsoft Learn: IP address planning in AKS, https://learn.microsoft.com/en-us/azure/aks/concepts-network-ip-address-planning
- Microsoft Learn: Azure CLI az aks nodepool reference, https://learn.microsoft.com/en-us/cli/azure/aks/nodepool
- Microsoft Learn: Manage Azure virtual networks, https://learn.microsoft.com/en-us/azure/virtual-network/manage-virtual-network

## Issues Found
- The post incorrectly described Azure CNI Pod Subnet dynamic IP allocation as Azure CNI Overlay. Updated the setup section to identify the feature as Azure CNI Pod Subnet dynamic IP allocation.
- The post claimed pod IPs are allocated one at a time as pods are scheduled and released exactly with pod deletion. Updated the explanation to match AKS behavior: nodes request pod IPs in batches of 16 and request another batch when fewer than 8 unallocated IPs remain.
- The prerequisite Azure CLI version was listed as 2.48 or later. Updated it to 2.37.0 or later based on Microsoft Learn for this AKS feature.
- The subnet capacity examples used raw CIDR host counts and did not account for Azure's reserved subnet addresses. Updated the usable IP counts for Azure subnets.
- The cluster creation text incorrectly said overlay networking mode supports this configuration. Updated it to Azure CNI Pod Subnet.
- The node pool examples omitted the node subnet ID. Added `--vnet-subnet-id` to match AKS documentation for adding node pools with pod subnet configuration.
- The verification command used the wrong `kubectl get pods -A -o wide` column for pod IPs. Added `--no-headers` and corrected the `awk` column.
- The verification text said Azure subnet usage would match the active pod count. Updated it to explain that allocation is batched and added the documented `kubectl get nodenetworkconfigs -n kube-system -o wide` check.
- The monitoring example used an unsupported `SubnetUsagePercentage` Azure Monitor metric on the virtual network. Replaced it with enabling Container Insights and guidance to enable `azure_subnet_ip_usage` and use the Subnet IP Usage workbook.
- The comparison table implied exact per-pod allocation and active-pod-only subnet planning. Updated it to reflect dynamic batch allocation and allocation headroom.

## Review Notes
The post is now technically aligned with current AKS documentation. The NSG example is syntactically valid, but production clusters should review AKS egress dependencies before applying broad outbound deny rules to pod subnets.
