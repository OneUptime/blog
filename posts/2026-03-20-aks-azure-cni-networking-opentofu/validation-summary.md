# Validation Summary: How to Configure AKS with Azure CNI Networking Using OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- Azure Kubernetes Service (AKS)
- Azure CNI Node Subnet
- Azure CNI Overlay
- OpenTofu
- Azure Resource Manager (`azurerm` provider)
- Azure CLI
- Kubernetes NetworkPolicy

## Sources Consulted
- Microsoft Learn: AKS CNI networking overview https://learn.microsoft.com/en-us/azure/aks/concepts-network-cni-overview
- Microsoft Learn: AKS legacy CNI concepts https://learn.microsoft.com/en-us/azure/aks/concepts-network-legacy-cni
- Microsoft Learn: AKS IP address planning https://learn.microsoft.com/en-us/azure/aks/concepts-network-ip-address-planning
- Microsoft Learn: Configure Azure CNI networking in AKS https://learn.microsoft.com/en-us/azure/aks/configure-azure-cni
- Microsoft Learn: Configure Azure CNI Pod Subnet dynamic IP allocation https://learn.microsoft.com/en-us/azure/aks/configure-azure-cni-dynamic-ip-allocation
- Microsoft Learn: Secure traffic between pods with network policies in AKS https://learn.microsoft.com/en-us/azure/aks/use-network-policies
- Microsoft Learn: Supported Kubernetes versions in AKS https://learn.microsoft.com/en-us/azure/aks/supported-kubernetes-versions
- Microsoft Learn: Azure CLI `az aks` reference https://learn.microsoft.com/en-us/cli/azure/aks?view=azure-cli-latest
- Terraform Registry: `azurerm_kubernetes_cluster` https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/kubernetes_cluster
- Terraform Registry: `azurerm_subnet` https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/subnet
- Kubernetes documentation: Network Policies https://kubernetes.io/docs/concepts/services-networking/network-policies/

## Issues Found
- The post hard-coded `kubernetes_version = "1.28"` in both AKS examples. That version is no longer in the current supported AKS window, so I changed both examples to `var.kubernetes_version` and added a note to use `az aks get-versions --location <region>` to select a supported version.
- The introduction and conclusion described Azure CNI as if all modes assign VNet IPs directly to pods. That is only true for flat Azure CNI models, not Azure CNI Overlay. I updated the wording to distinguish flat Azure CNI from Overlay.
- The IP planning guidance was oversimplified. I updated it to match current AKS guidance by accounting for upgrade surge capacity and Azure's five reserved subnet IPs.
- Step 2 actually demonstrates Azure CNI Node Subnet specifically, not Azure CNI generically. I clarified that in the section heading and surrounding text.
- The overlay example lacked the matching Network Contributor role assignment shown for the flat example. I added the role assignment so the overlay example is internally consistent for custom VNet scenarios.
- The command `az network vnet subnet show --query "ipConfigurations[].privateIPAddress"` is not a reliable way to list node IPs from subnet output. I replaced it with `kubectl get nodes -o wide` and clarified the expected pod IP behavior for flat versus overlay clusters.

## Review Notes
- The flat networking example is technically valid, but current AKS guidance recommends Azure CNI Overlay for most scenarios and Azure CNI Pod Subnet for flat-network deployments; Azure CNI Node Subnet is treated as a legacy flat-network model.
- The `network_policy = "azure"` example remains supported, but current AKS documentation recommends Cilium for new Linux deployments over Azure Network Policy Manager.
