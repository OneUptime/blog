# Validation Summary: How to Configure AKS Node Surge Upgrade Settings to Minimize Workload Disruption

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Kubernetes Service (AKS)
- AKS node pool rolling upgrades
- Azure CLI
- Kubernetes PodDisruptionBudgets
- kubectl
- Mermaid diagrams

## Sources Consulted
- Microsoft Learn: Configure rolling upgrades for Azure Kubernetes Service (AKS) node pools: https://learn.microsoft.com/en-us/azure/aks/upgrade-aks-node-pools-rolling
- Microsoft Learn: Upgrade options and recommendations for Azure Kubernetes Service (AKS) clusters: https://learn.microsoft.com/en-us/azure/aks/upgrade-options
- Microsoft Learn: Capacity and cost planning for Azure Kubernetes Service (AKS) upgrades: https://learn.microsoft.com/en-us/azure/aks/upgrade-capacity-cost-planning
- Microsoft Learn: Azure CLI `az aks nodepool` reference: https://learn.microsoft.com/en-us/cli/azure/aks/nodepool
- Microsoft Learn: Supported Kubernetes versions in AKS: https://learn.microsoft.com/en-us/azure/aks/supported-kubernetes-versions
- Kubernetes API reference: PodDisruptionBudget policy/v1: https://kubernetes.io/docs/reference/kubernetes-api/policy/pod-disruption-budget-v1/
- Kubernetes docs: Disruptions and PodDisruptionBudgets: https://kubernetes.io/docs/concepts/workloads/pods/disruptions/
- Kubernetes docs: Field selectors: https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors
- Kubernetes docs: kubectl command reference: https://kubernetes.io/docs/reference/kubectl/kubectl-cmds/

## Issues Found
- The introduction described the default AKS upgrade as a simple one-node-at-a-time flow without mentioning that AKS defaults to `max-surge` of one extra node. Updated it to describe the default buffer-node behavior accurately.
- The node surge explanation said workloads "always" have somewhere to run. Updated it to note that this depends on quota, IP capacity, scheduling constraints, and PDBs.
- The Mermaid flow showed AKS deleting old nodes during the normal rolling upgrade path. Updated it to show reimaging old nodes and removing remaining surge nodes, matching the AKS rolling-upgrade documentation.
- The 100% surge section described the behavior as a blue-green node upgrade. Updated it to clarify that 100% surge is the fastest rolling-upgrade setting, can drain all nodes in the pool simultaneously, and is usually more appropriate for test environments.
- The stateful workload guidance implied a separate node pool with high surge could provide zero disruption. Updated it to state that application-level redundancy and PDBs that allow safe evictions are still required.
- The `az aks upgrade` example used Kubernetes version `1.29.2`, which is no longer a generally supported AKS version as of June 1, 2026. Replaced it with `<target-version>`.
- The monitoring section referred to a specific temporary node naming pattern. Removed the specific pattern because AKS node names are implementation details and should not be relied on.
- The failure-handling section said an upgrade can be stopped and restarted. Updated it to match AKS documentation: after a drain timeout stops an upgrade, fix the blocker and run another update or upgrade operation so AKS resumes on the next PUT operation.

## Review Notes
The Azure CLI flags used in the post (`--max-surge`, `--node-taints`, `--kubernetes-version`, `--query`, and kubectl output/field-selector usage) are valid. The PDB example uses the current `policy/v1` API and a valid `maxUnavailable` configuration. The post now avoids hard-coding a Kubernetes patch version so it will age better as AKS supported versions change.
