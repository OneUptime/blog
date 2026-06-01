# Validation Summary: How to Use AKS Pod Priority and Preemption for Critical Workload Scheduling

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Kubernetes Service (AKS)
- Kubernetes PriorityClass
- Kubernetes pod priority and preemption
- Kubernetes scheduler
- Kubernetes PodDisruptionBudget
- Kubernetes Cluster Autoscaler
- kubectl
- Azure CLI

## Sources Consulted
- Kubernetes documentation: Pod Priority and Preemption - https://kubernetes.io/docs/concepts/scheduling-eviction/pod-priority-preemption/
- Kubernetes documentation: Advanced Pod Configuration / PriorityClasses - https://kubernetes.io/docs/concepts/workloads/pods/advanced-pod-config/
- Kubernetes generated kubectl reference - https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands
- Azure AKS documentation: Cluster autoscaling overview - https://learn.microsoft.com/en-us/azure/aks/cluster-autoscaler-overview
- Azure AKS documentation: Use the cluster autoscaler in AKS - https://learn.microsoft.com/en-us/azure/aks/cluster-autoscaler
- Kubernetes Cluster Autoscaler FAQ - https://github.com/kubernetes/autoscaler/blob/master/cluster-autoscaler/FAQ.md

## Issues Found
- The post used a custom PriorityClass named `system-critical`. Kubernetes reserves the `system-` prefix for system PriorityClasses, so this custom PriorityClass name would be invalid. Changed it to `platform-critical` and updated the corresponding workload reference.
- The description and introductory scheduling explanation overstated priority as a scheduling guarantee and described default scheduling as first-come-first-served. Updated the wording to explain that PriorityClasses provide a workload-importance signal and make higher-priority pods preferred, not guaranteed.
- The preemption explanation simplified victim selection too much and did not mention best-effort PodDisruptionBudget handling. Updated it to match Kubernetes documentation more closely.
- The `kubectl run --overrides` example omitted `apiVersion` and replaced the generated container list without including the container image. Added `apiVersion: v1` and the `image` field to the override JSON.
- The test command comment said to wait for pods to be running, but the command only counted pods. Replaced it with `kubectl rollout status deployment/filler`.
- The AKS autoscaler section claimed AKS could be configured with `expendable-pods-priority-cutoff` via `--cluster-autoscaler-profile` and said high-priority pods were exempt from scale-down eviction. AKS documentation does not list that upstream flag as a supported AKS profile setting, and upstream Cluster Autoscaler only treats pods below the cutoff as expendable for scale-up and scale-down blocking. Removed the invalid command and corrected the explanation.
- The PodDisruptionBudget best practice said Kubernetes respects PDBs during preemption and may override them after waiting. Kubernetes treats PDB protection during preemption as best effort, not time-based. Updated the wording.

## Review Notes
The remaining manifests use current Kubernetes API versions (`scheduling.k8s.io/v1`, `apps/v1`, and `batch/v1`) and current `kubectl` command forms. The example workloads assume the referenced namespaces and container images exist in the reader's environment.
