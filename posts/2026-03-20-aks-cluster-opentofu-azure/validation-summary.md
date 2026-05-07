# Validation Summary: How to Deploy an AKS Cluster with OpenTofu on Azure

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- Azure Kubernetes Service (AKS)
- AzureRM provider
- Azure CLI
- kubectl
- Azure CNI networking
- Azure RBAC
- Azure Monitor
- Microsoft Defender for Containers

## Sources Consulted
- OpenTofu provider requirements: https://opentofu.org/docs/language/providers/requirements/
- AzureRM `azurerm_kubernetes_cluster` documentation: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/kubernetes_cluster
- AzureRM `azurerm_kubernetes_cluster_node_pool` documentation: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/kubernetes_cluster_node_pool
- AKS availability zones guidance: https://learn.microsoft.com/en-us/azure/aks/reliability-availability-zones-configure
- AKS system node pools guidance: https://learn.microsoft.com/en-us/azure/aks/use-system-pools
- AKS managed Microsoft Entra integration: https://learn.microsoft.com/en-us/azure/aks/enable-authentication-microsoft-entra-id
- Azure CLI `az aks get-credentials`: https://learn.microsoft.com/en-us/cli/azure/aks#az-aks-get-credentials
- AKS CNI networking overview: https://learn.microsoft.com/en-us/azure/aks/azure-cni-overview
- Configure Azure CNI networking in AKS: https://learn.microsoft.com/en-us/azure/aks/configure-azure-cni

## Issues Found
- The provider example pinned `azurerm` to `~> 3.0` and used older AKS argument names such as `enable_auto_scaling` plus the removed `managed = true` field in the Azure RBAC block. I updated the snippet to the current AzureRM 4.x schema and removed the unused `azuread` provider requirement.
- The post described the cluster as production-ready and zonal, but the system node pool started with one node and could scale down to one node across three configured zones. I updated the system node pool to start at three nodes and keep a minimum of three nodes so the example matches the zonal and production guidance.
- The user node pool autoscaling example could also start below one node per zone. I added an initial `node_count` of three and raised the minimum to three so the pool actually spans the configured availability zones.
- The kubeconfig step referenced `tofu output -raw resource_group_name`, but that output was missing. I added the `resource_group_name` output so the documented command works as written.
- The prerequisites omitted tools that are required by later commands. I added Azure CLI and `kubectl`.
- The conclusion recommended generic Azure CNI for production, but current AKS guidance distinguishes between Azure CNI Overlay, Azure CNI Pod Subnet, and legacy Azure CNI Node Subnet. I corrected the conclusion to reflect the current recommendations.

## Review Notes
- The `az aks get-credentials` flow is still valid. For AKS clusters running Kubernetes 1.24 or later with managed Microsoft Entra integration, the exec-based `kubelogin` format is used automatically for interactive Azure CLI sign-in.
- The example still uses Azure CNI Node Subnet networking, which Microsoft now treats as a legacy flat-networking option. The configuration is valid, but new production clusters should be evaluated against Azure CNI Overlay or Azure CNI Pod Subnet based on current networking requirements.
