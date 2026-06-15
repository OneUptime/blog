# Validation Summary: How to Debug 'FailedScheduling' Errors

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- Kubernetes scheduler
- Kubernetes Pods and Deployments
- kubectl
- Node selectors and node affinity
- Taints and tolerations
- PersistentVolumes and PersistentVolumeClaims
- hostPort and NodePort networking
- PodDisruptionBudgets
- Topology spread constraints

## Sources Consulted
- Kubernetes Deployments documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes Resource Management for Pods and Containers: https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/
- Kubernetes Assigning Pods to Nodes: https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/
- Kubernetes Taints and Tolerations: https://kubernetes.io/docs/concepts/scheduling-eviction/taint-and-toleration/
- Kubernetes Pod Priority and Preemption: https://kubernetes.io/docs/concepts/scheduling-eviction/pod-priority-preemption/
- Kubernetes Disruptions / PodDisruptionBudget documentation: https://kubernetes.io/docs/concepts/workloads/pods/disruptions/
- Kubernetes Persistent Volumes documentation: https://kubernetes.io/docs/concepts/storage/persistent-volumes/
- Kubernetes Field Selectors documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/
- Kubernetes Pod Topology Spread Constraints documentation: https://kubernetes.io/docs/concepts/scheduling-eviction/topology-spread-constraints/
- Kubernetes Event API reference: https://kubernetes.io/docs/reference/kubernetes-api/core/event-v1/

## Issues Found
- The `apps/v1` Deployment examples omitted `spec.selector` and matching `spec.template.metadata.labels`. Kubernetes requires an explicit selector for `apps/v1` Deployments, and the selector must match the pod template labels. Added matching selectors and labels to the resource request, node affinity, toleration, and flexible scheduling examples.
- The PodDisruptionBudget section said PDBs can prevent scheduling during rolling updates and that the scheduler may not evict pods to make room. PDBs constrain voluntary disruptions and are only considered by scheduler preemption on a best-effort basis. Updated the section to clarify that PDBs do not block ordinary pod placement but can influence preemption victim selection.

## Review Notes
The diagnostic commands and scheduling explanations are generally accurate. `kubectl` was not installed in the local environment, so CLI command review was based on official Kubernetes documentation rather than local command execution.
