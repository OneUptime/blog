# Validation Summary: How to Implement Azure AKS Node Pools

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Azure Kubernetes Service (AKS)
- AKS node pools
- Azure CLI
- Kubernetes Deployments and Jobs
- Kubernetes taints, tolerations, labels, node selectors, and affinity
- Kubernetes PodDisruptionBudget
- AKS cluster autoscaler
- AKS Spot node pools
- AKS GPU node pools
- Azure Monitor for AKS

## Sources Consulted
- Microsoft Learn: Use system node pools in Azure Kubernetes Service (AKS) - https://learn.microsoft.com/en-us/azure/aks/use-system-pools
- Microsoft Learn: Create node pools in Azure Kubernetes Service (AKS) - https://learn.microsoft.com/en-us/azure/aks/create-node-pools
- Microsoft Learn: Use node taints in Azure Kubernetes Service (AKS) - https://learn.microsoft.com/en-us/azure/aks/use-node-taints
- Microsoft Learn: Add an Azure Spot node pool to Azure Kubernetes Service (AKS) - https://learn.microsoft.com/en-us/azure/aks/spot-node-pool
- Microsoft Learn: Azure CLI az aks reference - https://learn.microsoft.com/en-us/cli/azure/aks?view=azure-cli-latest
- Microsoft Learn: Azure CLI az aks nodepool reference - https://learn.microsoft.com/en-us/cli/azure/aks/nodepool?view=azure-cli-latest
- Microsoft Learn: Configure Azure CNI Powered by Cilium in AKS - https://learn.microsoft.com/en-us/azure/aks/azure-cni-powered-by-cilium
- Microsoft Learn: Use GPUs on Azure Kubernetes Service (AKS) - https://learn.microsoft.com/en-us/azure/aks/use-nvidia-gpu
- Kubernetes documentation: Pod API reference - https://kubernetes.io/docs/reference/kubernetes-api/core/pod-v1/
- Kubernetes documentation: Schedule GPUs - https://kubernetes.io/docs/tasks/manage-gpus/scheduling-gpus/
- Kubernetes documentation: Disruptions and PodDisruptionBudgets - https://kubernetes.io/docs/concepts/workloads/pods/disruptions/

## Issues Found
- The post stated that a system node pool automatically receives the `CriticalAddonsOnly=true:NoSchedule` taint. AKS automatically labels system pool nodes with `kubernetes.azure.com/mode=system`, but the `CriticalAddonsOnly` taint must be applied to enforce isolation. Updated the system pool examples to use `--nodepool-taints CriticalAddonsOnly=true:NoSchedule` and corrected the explanatory comment.
- The system pool examples used `Standard_DS2_v2`, which does not meet the current AKS documented system node pool requirement of at least 4 vCPUs and 4 GB memory. Updated the system pool VM size to `Standard_D4s_v5`.
- The `az aks create` examples used `--nodepool-mode System`, which is not part of the current `az aks create` reference. Removed it from create commands; the initial AKS node pool is the system pool.
- The autoscaling node pool name `autoscalepool` exceeded the AKS node pool name length limit. Renamed it to `autoscale`.
- The production cluster example used `--network-policy azure`, which maps to Azure Network Policy Manager, a legacy option with announced retirement dates. Updated the example to use Azure CNI Powered by Cilium via `--network-dataplane cilium`.
- The GPU examples implied that creating a GPU VM node pool is enough for pods requesting `nvidia.com/gpu`. AKS requires the NVIDIA device plugin, GPU Operator, or managed GPU stack for that resource to be advertised. Added comments calling out the required GPU plugin/operator setup before scheduling GPU workloads.
- The spot workload PDB comment implied PDBs maintain availability for spot VM evictions. PDBs govern voluntary disruptions and cannot prevent involuntary spot interruptions. Added a caveat to the manifest comment.

## Review Notes
The remaining Kubernetes manifests use current API versions and valid scheduling fields. The Spot node pool examples use valid AKS spot flags and the documented AKS spot taint and label. Azure CLI was not installed locally in the workspace, so CLI validation was performed against current Microsoft Learn CLI reference pages instead of local `az --help` output.
