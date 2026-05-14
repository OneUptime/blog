# Validation Summary: How to Configure Flux CD with Priority Classes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes PriorityClass
- Kubernetes scheduling, preemption, and node-pressure eviction
- Flux CD Kustomization resources
- Kustomize JSON patches
- kubectl

## Sources Consulted
- Kubernetes: Pod Priority and Preemption: https://kubernetes.io/docs/concepts/scheduling-eviction/pod-priority-preemption/
- Kubernetes: Node-pressure Eviction: https://kubernetes.io/docs/concepts/scheduling-eviction/node-pressure-eviction/
- Kubernetes: Declarative Management of Kubernetes Objects Using Kustomize: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/
- Kubernetes: kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Flux: Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux: Kustomize API reference v1: https://fluxcd.io/flux/components/kustomize/api/v1/

## Issues Found
- The introduction incorrectly blended scheduler preemption with node-pressure eviction. I changed it to distinguish scheduler preemption from kubelet node-pressure eviction, and noted that priority is one factor in kubelet eviction ordering.
- The PriorityClass explanation said Kubernetes uses priority in two ways. I updated it to include node-pressure eviction ordering as a third relevant use.
- The bootstrap ordering guidance implied that YAML document order alone ensures correctness for Flux-managed reconciliation. I narrowed the claim to initial bootstrap application and recommended explicit Flux dependency ordering for ongoing GitOps management.
- The `kubectl run` resource-hog example used unsupported `--requests` and `--limits` flags. I replaced them with a supported `--overrides` example that sets container resource requests and limits.
- The preemption test explanation implied a newly created lower-priority pod would be preempted. I corrected it to say the pod should fail to schedule, and that Flux controllers can preempt lower-priority workloads when they need to be rescheduled.

## Review Notes
The custom priority values are within Kubernetes' allowed range for user-created PriorityClasses and below the reserved built-in system-critical priorities. The Kustomize patch structure and Flux `dependsOn` usage match current official documentation.
