# Validation Summary: How to Create AKS Clusters with Custom Node Pools Using OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu
- Azure Kubernetes Service (AKS)
- AzureRM provider
- Azure CLI
- kubectl
- Kubernetes node pools and cluster autoscaler
- Azure CNI and Calico network policy

## Sources Consulted
- AzureRM provider docs for `azurerm_kubernetes_cluster`: https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/kubernetes_cluster.html.markdown
- AzureRM provider docs for `azurerm_kubernetes_cluster_node_pool`: https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/kubernetes_cluster_node_pool.html.markdown
- AKS supported Kubernetes versions: https://learn.microsoft.com/en-us/azure/aks/supported-kubernetes-versions
- Manage system node pools in AKS: https://learn.microsoft.com/en-us/azure/aks/use-system-pools
- Scale node pools in AKS: https://learn.microsoft.com/en-us/azure/aks/scale-node-pools
- Manually scale nodes in an AKS cluster: https://learn.microsoft.com/en-us/azure/aks/scale-cluster
- Cluster autoscaling in AKS overview: https://learn.microsoft.com/en-us/azure/aks/cluster-autoscaler-overview
- AKS storage concepts: https://learn.microsoft.com/en-us/azure/aks/concepts-storage
- Azure CLI `az aks nodepool` reference: https://learn.microsoft.com/en-us/cli/azure/aks/nodepool?view=azure-cli-latest
- Ephemeral OS disks for Azure VMs: https://learn.microsoft.com/en-us/azure/virtual-machines/ephemeral-os-disks

## Issues Found
- The post used the older AzureRM argument name `enable_auto_scaling` in both `default_node_pool` and `azurerm_kubernetes_cluster_node_pool`. Current provider docs use `auto_scaling_enabled`, so I updated all affected HCL examples.
- The blue node pool example used `kubernetes_version` on `azurerm_kubernetes_cluster_node_pool`. Current provider docs use `orchestrator_version` for node pool Kubernetes version pinning, so I corrected that field.
- The post pinned AKS to Kubernetes `1.28`, which is no longer supported as of 2026-05-07. I updated the version examples to `1.35`, which is a currently supported GA AKS version on that date.
- The deployment section showed `az aks nodepool scale` for a node pool configured with cluster autoscaler enabled. AKS documentation states that manual scaling is disabled when the cluster autoscaler is enabled, so I added the required `az aks nodepool update --disable-cluster-autoscaler` step before the manual scale command.
- The prerequisites omitted `Azure CLI` and `kubectl` even though the deployment section requires both. I added them to the prerequisites list.
- The conclusion said `only_critical_addons_enabled` applies to “system node pools” generally and that ephemeral OS disks use “VM host cache.” I corrected this to match current docs: `only_critical_addons_enabled` is the default system node pool setting in this example, and ephemeral OS disks use local VM storage rather than specifically host cache.

## Review Notes
- `network_policy = "calico"` with `network_plugin = "azure"` is still supported, but current AKS docs recommend Cilium for new Azure CNI deployments.
- The default system node pool size of 2 nodes is valid, but AKS guidance recommends 3 nodes for a production cluster with a single system node pool.
- AKS version support moves quickly. Any hardcoded Kubernetes minor version in this post should be rechecked periodically against the AKS supported versions page.
