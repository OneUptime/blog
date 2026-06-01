# Validation Summary: How to Configure AKS Spot Node Pools for Cost Optimization of Batch Workloads

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Kubernetes Service (AKS)
- Azure Spot Virtual Machines
- Azure CLI
- Kubernetes Jobs
- Kubernetes taints, tolerations, and node affinity
- Kubernetes PodDisruptionBudgets
- Azure Retail Prices API

## Sources Consulted
- Microsoft Learn: Add an Azure Spot node pool to an Azure Kubernetes Service (AKS) cluster - https://learn.microsoft.com/en-us/azure/aks/spot-node-pool
- Microsoft Learn: az aks nodepool CLI reference - https://learn.microsoft.com/en-us/cli/azure/aks/nodepool
- Microsoft Learn: Manage system node pools in Azure Kubernetes Service (AKS) - https://learn.microsoft.com/en-us/azure/aks/use-system-pools
- Microsoft Learn: Build Workloads with Azure Spot Virtual Machines - https://learn.microsoft.com/en-us/azure/architecture/guide/spot/spot-eviction
- Microsoft Learn: Scheduled Events for Azure Virtual Machines - https://learn.microsoft.com/en-us/azure/virtual-machines/scheduled-events-overview
- Microsoft Learn: Node Problem Detector (NPD) in Azure Kubernetes Service (AKS) nodes - https://learn.microsoft.com/en-us/azure/aks/node-problem-detector
- Microsoft Learn: Azure Retail Prices API overview - https://learn.microsoft.com/en-us/rest/api/cost-management/retail-prices/azure-retail-prices
- Kubernetes Documentation: Jobs - https://kubernetes.io/docs/concepts/workloads/controllers/job/
- Kubernetes Documentation: Taints and Tolerations - https://kubernetes.io/docs/concepts/scheduling-eviction/taint-and-toleration/
- Kubernetes Documentation: Pod Lifecycle - https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/
- Kubernetes Documentation: Disruptions and PodDisruptionBudgets - https://kubernetes.io/docs/concepts/workloads/pods/disruptions/

## Issues Found
- The post said Azure CLI 2.40+ was required. Microsoft documentation for AKS spot node pools requires Azure CLI 2.14 or later, so the prerequisite was corrected.
- The post said `--spot-max-price -1` means "maximum discount." Microsoft documentation states that `-1` means the VM won't be evicted based on price; the actual charge is the current spot price up to the pay-as-you-go price. The explanation and command comment were corrected.
- The post included an `az aks nodepool update --spot-max-price` command. AKS does not allow changing `SpotMaxPrice` after node pool creation, so the section now explains that the maximum price must be set when creating the pool and shows a replacement `az aks nodepool add` example.
- The post used `az vm list-skus` to check current spot prices. That command lists SKU capabilities, not retail spot prices. The example was replaced with an Azure Retail Prices API query.
- The eviction explanation said the node is deallocated. With AKS spot pools, the result depends on the configured eviction policy (`Delete` or `Deallocate`), so the wording was corrected.
- The graceful shutdown section said Kubernetes receives the 30-second warning. Azure provides a `Preempt` scheduled event with at least 30 seconds of notice, so the wording was corrected.
- The PDB section described spot eviction protection as best-effort. Kubernetes documentation states that PDBs cannot prevent involuntary disruptions, though unavailable pods count against the budget. The note was updated accordingly.
- The system pool description listed `kube-proxy` as an example of a system node pool component. AKS documentation uses examples such as CoreDNS and metrics-server for system pools, while kube-proxy runs as a node-level component, so the example was corrected.
- The monitoring command filtered for `reason=Preempted`. AKS Node Problem Detector reports scheduled Azure preemption events with the `PreemptScheduled` reason, so the field selector was corrected.

## Review Notes
The remaining Kubernetes manifests and Azure CLI examples are structurally correct for the documented AKS spot node pool workflow. The sample Python checkpoint code is illustrative and assumes application-specific functions such as `get_items` and `process` exist.
