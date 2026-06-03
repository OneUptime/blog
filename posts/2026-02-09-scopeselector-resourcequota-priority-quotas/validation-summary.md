# Validation Summary: How to Use scopeSelector in ResourceQuota for Priority-Based Quotas

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes ResourceQuota
- Kubernetes scopeSelector and quota scopes
- Kubernetes PriorityClass
- Kubernetes Pod QoS classes
- kubectl
- YAML

## Sources Consulted
- Kubernetes Resource Quotas documentation: https://kubernetes.io/docs/concepts/policy/resource-quotas/
- Kubernetes ResourceQuota API reference: https://kubernetes.io/docs/reference/kubernetes-api/core/resource-quota-v1/
- Kubernetes Pod Quality of Service Classes documentation: https://kubernetes.io/docs/concepts/workloads/pods/pod-qos/
- Kubernetes kubectl get reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Kubernetes kubectl create priorityclass reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_priorityclass/

## Issues Found
- Corrected invalid `scopeName: QoS` examples. Kubernetes ResourceQuota does not support a generic `QoS` scope with values like `Guaranteed` or `Burstable`; it supports `BestEffort` and `NotBestEffort` quota scopes.
- Corrected invalid `scopeName: TerminationState` examples. Kubernetes uses `scopeName: Terminating` and `scopeName: NotTerminating` with `operator: Exists`.
- Corrected the explanation of Terminating quotas. In ResourceQuota, Terminating means `.spec.activeDeadlineSeconds` is set, not that a pod is currently being deleted during graceful shutdown.
- Updated combined-scope examples to combine `PriorityClass` with `NotBestEffort` instead of the unsupported `QoS` selector.
- Fixed the mixed workload example so the low-priority experiments quota actually matches BestEffort pods.
- Corrected the sample `kubectl get resourcequota` output to include the `LIMIT` column.
- Corrected the claim that pods without a matching PriorityClass-scoped quota cannot use any quota. Scoped quotas only track matching objects unless the ResourceQuota admission configuration limits a resource to require a matching quota.
- Replaced the incorrect quoted-vs-unquoted YAML example. Quoted and unquoted YAML strings are equivalent; the corrected example now demonstrates case-sensitive PriorityClass matching.
- Added the required operator caveat for `BestEffort`, `NotBestEffort`, `Terminating`, and `NotTerminating`: use `Exists` and omit `values`.

## Review Notes
Could not run local `kubectl` validation because `kubectl` is not installed in this workspace. The API fields, supported scope names, operators, and command forms were validated against official Kubernetes documentation.
