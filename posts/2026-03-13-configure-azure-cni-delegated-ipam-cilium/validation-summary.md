# Validation Summary: Configure Azure CNI Delegated IPAM with Cilium

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Kubernetes Service (AKS)
- Azure CNI powered by Cilium
- Cilium delegated IPAM
- Kubernetes
- Azure CLI
- kubectl

## Sources Consulted
- Microsoft Learn: Configure Azure CNI Powered by Cilium in Azure Kubernetes Service (AKS) - https://learn.microsoft.com/en-us/azure/aks/azure-cni-powered-by-cilium
- Microsoft Learn: Configure Azure CNI Pod Subnet - Dynamic IP Allocation and enhanced subnet support in AKS - https://learn.microsoft.com/en-us/azure/aks/configure-azure-cni-dynamic-ip-allocation
- Microsoft Learn: Azure CLI `az aks create` reference - https://learn.microsoft.com/en-us/cli/azure/aks
- Microsoft Learn: Update Azure CNI IP Address Management mode and data plane technology - https://learn.microsoft.com/en-us/azure/aks/update-azure-cni
- Cilium documentation: Azure Delegated IPAM - https://docs.cilium.io/en/stable/network/concepts/ipam/azure-delegated-ipam/
- Cilium documentation: Helm Reference - https://docs.cilium.io/en/stable/helm-reference/

## Issues Found
- The original AKS creation command mixed `--vnet-subnet-id` with `--pod-cidr` but did not enable Azure CNI Overlay. Azure CLI documentation states `--pod-cidr` is used with Azure CNI Overlay or kubenet, while pod-subnet clusters use `--pod-subnet-id`. Updated the command to create separate node and pod subnets and pass `--pod-subnet-id`.
- The post described Azure CNI delegated IPAM as Cilium cluster-scope or multi-pool IPAM. Cilium documentation states Azure delegated IPAM uses the delegated plugin with AKS `NodeNetworkConfig` resources. Updated the explanation to describe AKS-managed delegated IPAM accurately.
- The post inspected `CiliumNode` `.spec.ipam` for allocations. AKS dynamic pod subnet documentation points to `NodeNetworkConfig` resources for delegated IPAM allocation state. Updated verification commands to use `kubectl get nodenetworkconfigs -n kube-system`.
- The post included an unsupported `cilium-config` ConfigMap and Helm upgrade to set `ipam.mode=cluster-pool`. Microsoft documentation states AKS manages the Cilium configuration and only label exclusion changes are supported. Replaced this with supported inspection commands and guidance to configure pod address ranges at cluster creation.
- The best practices referenced `/24` Cilium node blocks, Cilium IPAM pool metrics, and VM SKU pool capacity in ways that do not match AKS delegated IPAM behavior. Updated the guidance to pod subnet planning, dynamic allocation batches, and AKS pod limits.

## Review Notes
Azure CNI powered by Cilium supports both overlay and virtual-network pod addressing. This review kept the article focused on the VNet pod-subnet path because the original post emphasized VNet integration.
