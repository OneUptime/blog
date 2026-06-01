# Validation Summary: How to Use Pod Disruption Budgets on AKS for High Availability During Upgrades

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Kubernetes Service (AKS)
- Kubernetes PodDisruptionBudget API (`policy/v1`)
- Kubernetes Deployments and Stateful workloads
- `kubectl drain`, `kubectl cordon`, and `kubectl get pdb`
- Azure CLI `az aks nodepool update` and `az aks nodepool upgrade`

## Sources Consulted
- Kubernetes documentation: Disruptions - https://kubernetes.io/docs/concepts/workloads/pods/disruptions/
- Kubernetes documentation: Specifying a Disruption Budget for your Application - https://kubernetes.io/docs/tasks/run-application/configure-pdb/
- Kubernetes API reference: PodDisruptionBudget `policy/v1` - https://kubernetes.io/docs/reference/kubernetes-api/policy/pod-disruption-budget-v1/
- Microsoft Learn: How Azure Kubernetes Service cluster upgrades work - https://learn.microsoft.com/en-us/azure/aks/how-does-upgrade-happen
- Microsoft Learn: Resize Node Pools in Azure Kubernetes Service - https://learn.microsoft.com/en-us/azure/aks/resize-node-pool
- Microsoft Learn: Add an Azure Spot node pool to an AKS cluster - https://learn.microsoft.com/en-us/azure/aks/spot-node-pool
- Microsoft Learn: Troubleshoot upgrade failure because of conflicting PodDisruptionBudgets - https://learn.microsoft.com/en-us/troubleshoot/azure/azure-kubernetes/extensions/troubleshoot-eviction-autoscaler
- Microsoft Learn: Azure CLI `az aks nodepool` reference - https://learn.microsoft.com/en-us/cli/azure/aks/nodepool?view=azure-cli-latest

## Issues Found
- The post described Spot instance evictions as voluntary disruptions protected by PDBs. Azure Spot capacity evictions are not planned Kubernetes drain operations, so I moved them to the involuntary disruption list and clarified that PDBs only help Spot workloads when the operation uses Kubernetes eviction.
- The introduction claimed PDBs keep services running through every kind of cluster operation. I narrowed this to planned cluster operations because PDBs do not prevent involuntary disruptions.
- The CoreDNS/system component example could encourage creating duplicate PDBs for AKS-managed components. I added a warning to verify existing AKS-managed PDBs first because pods covered by multiple PDBs can block eviction during upgrades.
- The node pool upgrade command used a hard-coded Kubernetes version, `1.28.0`, which is stale for a current AKS guide. I replaced it with `<supported-version>`.
- The upgrade explanation said AKS drains old nodes one at a time. I revised it to say AKS cordons and drains nodes according to node pool upgrade settings, since `maxSurge` and upgrade behavior can vary.
- The "blocks all evictions" warning said drains will hang forever. I changed it to "hang or fail" because AKS and drain commands can fail or time out when PDBs block eviction.

## Review Notes
The PDB YAML examples use the current `policy/v1` API and valid `minAvailable`, `maxUnavailable`, selector, and topology spread fields. Percentage-based PDBs are valid; Kubernetes rounds percentage values up, which may be worth mentioning in a future improvement for small replica counts.
