# Validation Summary: How to Configure AKS Node Pools in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- HashiCorp AzureRM Provider
- Azure Kubernetes Service (AKS)
- Kubernetes node pools, node selectors, taints, and tolerations
- Azure Spot node pools
- NVIDIA GPU workloads on AKS

## Sources Consulted
- HashiCorp Terraform Registry: azurerm_kubernetes_cluster resource - https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/kubernetes_cluster
- HashiCorp Terraform Registry: azurerm_kubernetes_cluster_node_pool resource - https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/kubernetes_cluster_node_pool
- Microsoft Learn: Supported Kubernetes versions in AKS - https://learn.microsoft.com/en-us/azure/aks/supported-kubernetes-versions
- Microsoft Learn: Create node pools in AKS - https://learn.microsoft.com/en-us/azure/aks/create-node-pools
- Microsoft Learn: Use system node pools in AKS - https://learn.microsoft.com/en-us/azure/aks/use-system-pools
- Microsoft Learn: Add an Azure Spot node pool to an AKS cluster - https://learn.microsoft.com/en-us/azure/aks/spot-node-pool
- Microsoft Learn: Use GPUs on AKS - https://learn.microsoft.com/en-us/azure/aks/use-nvidia-gpu
- Microsoft Learn: Use labels in an AKS cluster - https://learn.microsoft.com/en-us/azure/aks/use-labels
- Kubernetes Documentation: Assigning Pods to Nodes - https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/
- Kubernetes Documentation: Taints and Tolerations - https://kubernetes.io/docs/concepts/scheduling-eviction/taint-and-toleration/

## Issues Found
- The examples used the older AzureRM argument `enable_auto_scaling`. Updated all node pool snippets to use the current `auto_scaling_enabled` argument.
- The base cluster example used Kubernetes version `1.28`, which is no longer a current standard AKS version for new examples. Updated it to `1.35`, which is supported as of the validation date.
- The system node pool used `Standard_D2s_v5`, but AKS system pools require a VM SKU with at least 4 vCPUs and 4 GB of memory. Updated it to `Standard_D4s_v5`.
- The base cluster referenced `azurerm_subnet.aks.id` without defining that subnet in the snippet. Removed the undefined subnet reference so the example is internally consistent.
- Multiple AKS node pools require the Standard load balancer SKU. Added `load_balancer_sku = "standard"` to the cluster network profile.
- The Terraform snippets used numeric zone values. Updated them to string zone values to match the AzureRM provider schema.
- The Spot node pool example set the reserved AKS label `kubernetes.azure.com/scalesetpriority`. Removed the reserved label from user-defined `node_labels`; AKS applies Spot priority labels itself.
- The Spot max price comment said `-1` means paying whatever Spot costs. Updated it to clarify that `-1` prevents eviction based on price.
- The system node pool explanation listed `kube-proxy` as if it only runs on system node pools. Removed that example because kube-proxy runs as a system component across nodes.
- The node pool naming tip omitted the requirement that Linux node pool names start with a lowercase letter. Added that requirement.

## Review Notes
- The GPU section is technically accurate for node pool creation and workload scheduling, but real GPU workloads also need the NVIDIA device plugin or GPU Operator available in the cluster before `nvidia.com/gpu` resources are schedulable.
- AKS currently marks `kubernetes.azure.com/scalesetpriority` as deprecated in the labels documentation, but the Spot node pool documentation still uses the corresponding Spot taint for scheduling examples.
