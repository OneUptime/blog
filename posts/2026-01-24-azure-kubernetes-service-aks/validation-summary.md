# Validation Summary: How to Handle Azure Kubernetes Service (AKS)

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Azure Kubernetes Service (AKS)
- Azure CLI
- Terraform AzureRM provider
- Kubernetes node pools, ingress, and network policies
- Azure Container Registry
- Azure Monitor Container Insights and KQL
- NGINX Ingress Controller

## Sources Consulted
- Microsoft Learn: Azure CLI `az aks` reference: https://learn.microsoft.com/en-us/cli/azure/aks?view=azure-cli-latest
- Microsoft Learn: Azure CLI `az aks nodepool` reference: https://learn.microsoft.com/en-us/cli/azure/aks/nodepool?view=azure-cli-latest
- Microsoft Learn: Secure pod traffic with network policies in AKS: https://learn.microsoft.com/en-us/azure/aks/use-network-policies
- Microsoft Learn: Supported Kubernetes versions in AKS: https://learn.microsoft.com/en-us/azure/aks/supported-kubernetes-versions
- Microsoft Learn: Upgrade the AKS control plane: https://learn.microsoft.com/en-us/azure/aks/upgrade-aks-control-plane
- Microsoft Learn: Use system node pools in AKS: https://learn.microsoft.com/en-us/azure/aks/use-system-pools
- Microsoft Learn: Add an Azure Spot node pool to AKS: https://learn.microsoft.com/en-us/azure/aks/spot-node-pool
- Microsoft Learn: Azure Monitor `KubePodInventory` table reference: https://learn.microsoft.com/en-us/azure/azure-monitor/reference/tables/kubepodinventory
- Microsoft Learn: Azure Monitor `KubeNodeInventory` table reference: https://learn.microsoft.com/en-us/azure/azure-monitor/reference/tables/kubenodeinventory
- Microsoft Learn: Azure Monitor `Perf` table reference: https://learn.microsoft.com/en-us/azure/azure-monitor/reference/tables/perf
- Kubernetes documentation: Ingress concept and `networking.k8s.io/v1` examples: https://kubernetes.io/docs/concepts/services-networking/ingress/
- HashiCorp AzureRM provider documentation source for `azurerm_kubernetes_cluster`: https://github.com/hashicorp/terraform-provider-azurerm/blob/main/website/docs/r/kubernetes_cluster.html.markdown
- HashiCorp AzureRM provider documentation source for `azurerm_kubernetes_cluster_node_pool`: https://github.com/hashicorp/terraform-provider-azurerm/blob/main/website/docs/r/kubernetes_cluster_node_pool.html.markdown

## Issues Found
- The AKS creation examples used Azure Network Policy Manager (`--network-policy azure` and `network_policy = "azure"`) as the default best-practice configuration. Microsoft now documents Azure NPM retirement for Linux nodes and recommends Azure CNI Powered by Cilium for scalability and long-term support. Updated the Azure CLI and Terraform snippets to use Azure CNI overlay with Cilium dataplane and Cilium network policy.
- The Terraform examples used `enable_auto_scaling`, which is not the current AzureRM provider argument. Replaced it with `auto_scaling_enabled` for both the default node pool and user node pool.
- The Terraform cluster example pinned Kubernetes `1.28`, and the upgrade example pinned `1.29.0`. As of June 20, 2026, those versions are outside normal AKS support unless a specific LTS support plan applies. Updated the cluster example to a supported minor version alias and changed the upgrade commands to use a target version selected from `az aks get-upgrades`.
- The KQL restart query used `RestartCount`, which is not a column in `KubePodInventory`. Replaced it with `PodRestartCount` and updated the projection and sort accordingly.
- The Spot node pool comment claimed "up to 90% cost savings." The official AKS Spot node pool documentation describes significant savings but does not guarantee that specific percentage. Reworded the comment to avoid an unsupported exact claim.

## Review Notes
- The Azure CLI was not installed in the local environment, so CLI flags were verified against current Microsoft Learn CLI reference pages rather than local `az --help` output.
- The AKS version examples are inherently time-sensitive. Future reviews should re-check the AKS release calendar and region availability before republishing.
