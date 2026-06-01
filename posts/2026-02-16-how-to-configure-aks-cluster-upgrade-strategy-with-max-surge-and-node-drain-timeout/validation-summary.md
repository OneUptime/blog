# Validation Summary: How to Configure AKS Cluster Upgrade Strategy with Max Surge

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Kubernetes Service (AKS)
- Kubernetes node pool upgrades
- Azure CLI
- Kubernetes PodDisruptionBudgets
- Kubernetes pod termination behavior
- Mermaid diagrams

## Sources Consulted
- Microsoft Learn: Configure rolling upgrades for Azure Kubernetes Service (AKS) node pools: https://learn.microsoft.com/en-us/azure/aks/upgrade-aks-node-pools-rolling
- Microsoft Learn: Azure CLI `az aks nodepool` reference: https://learn.microsoft.com/en-us/cli/azure/aks/nodepool
- Microsoft Learn: Supported Kubernetes versions in Azure Kubernetes Service: https://learn.microsoft.com/en-us/azure/aks/supported-kubernetes-versions
- Microsoft Learn: Upgrade the Azure Kubernetes Service (AKS) cluster control plane: https://learn.microsoft.com/en-us/azure/aks/upgrade-aks-control-plane
- Kubernetes documentation: Specifying a Disruption Budget for your Application: https://kubernetes.io/docs/tasks/run-application/configure-pdb/
- Kubernetes documentation: Pod Lifecycle, Pod termination flow: https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/#pod-termination

## Issues Found
- The post incorrectly stated that AKS waits indefinitely by default during node drain. Updated it to state that the default node drain timeout is 30 minutes, with supported values from 5 minutes to 24 hours.
- The post incorrectly stated that setting drain timeout to `0` restores the default indefinite behavior. Replaced that example with a valid `45` minute timeout.
- The post incorrectly stated that AKS forcefully removes remaining pods and proceeds when the drain timeout expires. Updated it to state that AKS stops the upgrade operation, and the operator must fix the blocked drain and resume the upgrade.
- The stateless workload guidance described forced termination as acceptable. Updated the wording to reflect that the timeout stops the upgrade and requires intervention rather than forcefully terminating pods.
- The upgrade failure examples used fixed Kubernetes versions (`1.28.5` and `1.27.9`) that are stale and region/support-window dependent. Replaced them with placeholders for the target version and a supported older version.

## Review Notes
- The Azure CLI reference currently lists the drain timeout flag as `--drain-timeout`, while the AKS rolling upgrade article examples use `--drain-time-out`. The post uses `--drain-timeout`, which matches the current Azure CLI reference.
- The max surge guidance is consistent with Microsoft documentation: the default is one surge node, values can be integer or percentage, percentages round up, and Microsoft recommends 33% for production node pools.
- The PodDisruptionBudget examples use `policy/v1` and valid `maxUnavailable` / `minAvailable` fields. The guidance about `minAvailable` equal to replica count blocking drains is consistent with Kubernetes documentation.
