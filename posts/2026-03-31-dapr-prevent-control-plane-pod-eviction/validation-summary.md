# Validation Summary: How to Prevent Dapr Control Plane Pod Eviction on Kubernetes

## Status
validated

## Post Type
Guide

## Technologies Covered
- Dapr (control plane components: operator, sentry, sidecar injector, placement)
- Kubernetes (QoS classes, PodDisruptionBudgets, PriorityClasses, pod eviction)
- Helm (Dapr Helm chart configuration)

## Sources Consulted
- Kubernetes documentation on QoS classes and pod eviction (https://kubernetes.io/docs/concepts/workloads/pods/pod-qos/)
- Kubernetes documentation on PodDisruptionBudgets (https://kubernetes.io/docs/concepts/workloads/pods/disruptions/)
- Kubernetes documentation on Priority and Preemption (https://kubernetes.io/docs/concepts/scheduling-eviction/pod-priority-preemption/)
- Dapr Helm chart values structure (cross-referenced with other validated posts in this repository using the same chart keys)
- Kubernetes `policy/v1` API reference for PDB resources

## Issues Found
No technical issues found.

## Review Notes
- The placement PDB sets `minAvailable: 2`, which assumes at least 3 replicas are running (the default for Dapr HA mode). This is appropriate for production but would be unsatisfiable in a non-HA single-replica setup. The post implicitly targets production/HA deployments, which is reasonable given the topic.
- The PDB label selectors use the `app` label key (e.g., `app: dapr-operator`), which is set by the Dapr Helm chart. Users with custom label configurations would need to adjust these selectors.
- There is thematic overlap with the existing post `dapr-priority-classes-control-plane-pods`, which focuses specifically on PriorityClasses. This post has a broader scope covering three complementary mechanisms (QoS, PDBs, PriorityClasses) together, so both posts have distinct value.
