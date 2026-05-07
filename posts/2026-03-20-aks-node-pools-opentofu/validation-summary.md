# Validation Summary: How to Configure AKS Node Pools with OpenTofu

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- OpenTofu
- HCL
- Azure Kubernetes Service (AKS)
- AzureRM provider
- Azure CLI
- kubectl

## Sources Consulted
- Azure Kubernetes Service: Create node pools in AKS: https://learn.microsoft.com/en-us/azure/aks/create-node-pools
- Azure Kubernetes Service: Use system node pools in AKS: https://learn.microsoft.com/en-us/azure/aks/use-system-pools
- Azure Kubernetes Service: Use GPUs on AKS: https://learn.microsoft.com/en-us/azure/aks/gpu-cluster
- Azure CLI reference for `az aks get-credentials`: https://learn.microsoft.com/en-us/cli/azure/aks#az-aks-get-credentials
- AzureRM provider overview and authentication/features guidance: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs
- AzureRM provider features block guide: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/guides/features-block
- AzureRM `azurerm_kubernetes_cluster` resource documentation source: https://github.com/hashicorp/terraform-provider-azurerm/blob/main/website/docs/r/kubernetes_cluster.html.markdown
- AzureRM `azurerm_kubernetes_cluster_node_pool` resource documentation source: https://github.com/hashicorp/terraform-provider-azurerm/blob/main/website/docs/r/kubernetes_cluster_node_pool.html.markdown
- OpenTofu CLI `init` command documentation source: https://github.com/opentofu/opentofu/blob/main/website/docs/cli/commands/init.mdx
- OpenTofu CLI `apply` command documentation source: https://github.com/opentofu/opentofu/blob/main/website/docs/cli/commands/apply.mdx

## Issues Found
- The post used `enable_auto_scaling` in all AKS node pool examples. Current AzureRM v4 documentation uses `auto_scaling_enabled`, so I updated the cluster and node pool snippets to the current field name.
- The main `main.tf` snippet referenced `azurerm_resource_group.rg` without defining it and omitted the AzureRM provider block required for a working plan/apply flow. I added a minimal `terraform` block with the AzureRM provider pin, a `provider "azurerm" { features {} }` block, and the missing resource group resource so the example can run as written.
- The default system node pool used `Standard_D2s_v3`. AKS system node pools require a VM SKU with at least 4 vCPUs and 4 GB of memory, so I changed it to `Standard_D4s_v3`.

## Review Notes
- The AKS GPU node pool example is valid as written: `Standard_NC6s_v3` is a supported/recommended GPU-capable size, and the AzureRM node pool resource allows a user pool to start at `node_count = 0` when autoscaling is enabled.
- Azure documentation currently phrases minimum system-pool node counts differently across related articles. The sample's initial `node_count = 2` matches Microsoft examples, but single system pools in production are generally documented with a recommendation of three nodes.
- The Azure CLI wasn't installed in the local review environment, so `az aks get-credentials` was verified against Microsoft Learn rather than local `az -h` output.
