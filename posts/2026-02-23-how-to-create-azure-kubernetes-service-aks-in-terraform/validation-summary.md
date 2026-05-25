# Validation Summary: How to Create Azure Kubernetes Service (AKS) in Terraform

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform
- AzureRM Terraform Provider
- Azure Kubernetes Service (AKS)
- Azure CNI networking
- Azure Container Registry
- Azure Monitor and Log Analytics
- Azure CLI

## Sources Consulted
- HashiCorp Terraform AzureRM provider documentation for `azurerm_kubernetes_cluster`: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/kubernetes_cluster
- HashiCorp Terraform AzureRM provider documentation for `azurerm_container_registry`: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/container_registry
- HashiCorp Terraform AzureRM provider documentation for `azurerm_log_analytics_workspace`: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/log_analytics_workspace
- Microsoft AKS supported Kubernetes versions: https://learn.microsoft.com/en-us/azure/aks/supported-kubernetes-versions
- Microsoft AKS IP address planning guidance: https://learn.microsoft.com/en-us/azure/aks/concepts-network-ip-address-planning
- Microsoft Azure CLI `az aks get-credentials` reference: https://learn.microsoft.com/en-us/cli/azure/aks#az-aks-get-credentials

## Issues Found
- The post pinned AKS to Kubernetes `1.28`, which is no longer appropriate for a new AKS cluster as of the review date. I changed the example and variable default to `1.35`, which Microsoft documents as a GA AKS version in the current supported versions table.
- The Azure CNI subnet was `10.0.1.0/24`, which is too small for the configured `max_pods = 50` and autoscaling up to five nodes once node IPs, pod IPs, and upgrade surge capacity are considered. I changed it to `10.0.0.0/22`.
- The provider version constraint used an older AKS provider line, `~> 3.80`. I updated it to `~> 3.116`, aligning with HashiCorp's late 3.x AzureRM provider guidance while preserving the syntax used in the examples.
- The variables section claimed to extract hard-coded values, but the earlier resource snippets did not use those variables. I updated the resource group, cluster Kubernetes version, node count, and VM size examples to reference the defined variables.
- The version pinning note said Azure could unexpectedly upgrade the cluster on Terraform re-apply when no version is specified. HashiCorp's provider docs state the recommended version is selected at provisioning time but does not auto-upgrade. I changed the wording to explain the real risk: different versions can be selected when the same configuration is used later or in another environment.

## Review Notes
Terraform was not installed in the local environment, so I could not run `terraform validate`. The review was completed through static inspection and official documentation checks. The AzureRM `managed` argument in the Azure AD RBAC block is deprecated in the late 3.x provider line but still documented as required to be set to `true` for AKS-managed Entra integration before AzureRM v4, so it was left unchanged for this provider version.
