# Validation Summary: How to Configure Dapr High Availability

## Status
validated

## Post Type
Guide

## Technologies Covered
- Dapr (control plane HA mode)
- Kubernetes (PodDisruptionBudgets, pod anti-affinity, node drain)
- Helm (Dapr chart installation)
- Dapr CLI
- Dapr Resiliency CRD (retries, circuit breakers)

## Sources Consulted
- Dapr CLI init reference: https://docs.dapr.io/reference/cli/dapr-init/
- Dapr production guidelines on Kubernetes: https://docs.dapr.io/operations/hosting/kubernetes/kubernetes-production/
- Dapr Helm chart values.yaml: https://github.com/dapr/dapr/blob/master/charts/dapr/values.yaml
- Dapr Resiliency spec schema: https://docs.dapr.io/reference/resource-specs/resiliency-schema/
- Dapr retry policies: https://docs.dapr.io/operations/resiliency/policies/retries/retries-overview/
- Dapr circuit breaker policies: https://docs.dapr.io/operations/resiliency/policies/circuit-breakers/
- Dapr resiliency targets: https://docs.dapr.io/operations/resiliency/targets/
- Dapr Scheduler service docs: https://docs.dapr.io/concepts/dapr-services/scheduler/
- Dapr Placement service docs: https://docs.dapr.io/concepts/dapr-services/placement/
- Dapr Operator service docs: https://docs.dapr.io/concepts/dapr-services/operator/
- Kubernetes kubectl drain reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_drain/
- Kubernetes PodDisruptionBudget API reference: https://kubernetes.io/docs/reference/kubernetes-api/policy-resources/pod-disruption-budget-v1/
- Kubernetes pod affinity/anti-affinity: https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/

## Issues Found
1. **Inaccurate blanket claim about leader election**: The introduction stated HA mode "uses leader election to coordinate" replicas, and the summary said it "uses leader election to prevent split-brain scenarios." This is only true for the operator (Kubernetes leader election) and placement service (Raft consensus). The scheduler service uses a peer-based model with embedded etcd and does not use leader election. Updated both the introduction and summary to accurately distinguish between leader election and peer-based coordination depending on the component.

## Review Notes
- The post omits `dapr-sidecar-injector` from the list of control plane components that receive HA replicas. This is not technically wrong (the four listed components are correct), but readers should be aware the injector also scales in HA mode.
- The Scheduler and Placement services have independent HA controls (`dapr_scheduler.ha` and `dapr_placement.ha` in the Helm chart) that the post does not mention. The `global.ha.enabled=true` flag covers the common case, but advanced users may need finer-grained control.
- All code examples, YAML configurations, CLI commands, and Kubernetes resource definitions are syntactically correct and use current, non-deprecated APIs and flags.
