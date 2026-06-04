# Validation Summary: How to Configure PriorityClass and Preemption for Critical System Workloads

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes PriorityClass
- Kubernetes scheduler preemption
- PodDisruptionBudget
- ResourceQuota
- kubectl
- jq
- Prometheus textfile-style metrics

## Sources Consulted
- Kubernetes documentation: Pod Priority and Preemption - https://kubernetes.io/docs/concepts/scheduling-eviction/pod-priority-preemption/
- Kubernetes documentation: Resource Quotas, PriorityClass scope - https://kubernetes.io/docs/concepts/policy/resource-quotas/
- Kubernetes kubectl reference: kubectl wait - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/
- Kubernetes API reference: PodDisruptionBudget v1 - https://kubernetes.io/docs/reference/kubernetes-api/policy/pod-disruption-budget-v1/

## Issues Found
- The sample PriorityClass name `system-critical` used the reserved `system-` prefix. Kubernetes does not allow user-created PriorityClass names to be prefixed with `system-`, so it was renamed to `platform-critical` in the class definition and pod template.
- The priority value range was described as typically `0` to `1,000,000,000`, and values above that were described as system-critical pods that should never be preempted. Updated this to the documented user-created PriorityClass range of `-2,147,483,648` to `1,000,000,000`, with larger values reserved for built-in system-critical PriorityClasses.
- The preemption sequence said the scheduler sends `SIGTERM`. Updated this because the scheduler selects and deletes victim pods; graceful container termination is handled through normal pod termination by the kubelet.
- The PDB section said the scheduler will not preempt pods if doing so violates the PDB. Kubernetes only respects PDBs on a best-effort basis during scheduler preemption, so the wording was corrected.
- The ResourceQuota example included `persistentvolumeclaims` under a `PriorityClass` scoped quota. Kubernetes only allows pod-related compute resources for PriorityClass-scoped quotas, so that invalid hard limit was removed.
- The StatefulSet priority text implied high-priority stateful workloads cannot be preempted. Updated the wording to clarify that priority makes them less likely to be preempted by lower-value workloads, not immune to higher-priority preemption.
- The best-practice recommendation to reserve priorities above `1,000,000,000` for user workloads was corrected because those values are reserved for built-in system-critical PriorityClasses.

## Review Notes
The examples use placeholder images, namespaces, storage classes, and a ConfigMap-only metrics script, so they remain illustrative rather than complete deployable production manifests. `kubectl` was not installed in the local workspace, so CLI syntax was checked against the official Kubernetes kubectl reference instead of local help output.
