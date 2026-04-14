# Validation Summary: Configure Dapr Placement Service for High Availability

## Status
validated

## Post Type
Tutorial / Operations Guide

## Technologies Covered
- Dapr (placement service, actor model, Raft consensus)
- Kubernetes (StatefulSet, PodDisruptionBudget, pod anti-affinity, topology spread)
- Helm (Dapr Helm chart configuration)

## Sources Consulted
- Dapr production guidelines for Kubernetes: https://docs.dapr.io/operations/hosting/kubernetes/kubernetes-production/
- Dapr placement service overview: https://docs.dapr.io/concepts/dapr-services/placement/
- Dapr actors API reference: https://docs.dapr.io/reference/api/actors_api/
- Dapr Kubernetes deployment docs: https://docs.dapr.io/operations/hosting/kubernetes/kubernetes-deploy/
- Dapr Helm chart values.yaml: https://github.com/dapr/dapr/blob/master/charts/dapr/values.yaml
- Kubernetes PodDisruptionBudget API reference: https://kubernetes.io/docs/reference/kubernetes-api/policy-resources/pod-disruption-budget-v1/
- Kubernetes pod topology spread constraints: https://kubernetes.io/docs/concepts/scheduling-eviction/topology-spread-constraints/

## Issues Found
- **Redundant/invalid Helm flags in the install command**: The original Helm command included `--set dapr_placement.ha=true` and `--set dapr_placement.replicaCount=3` alongside `--set global.ha.enabled=true`. The `global.ha.enabled=true` flag is the documented way to enable HA for all Dapr control plane services, including the placement service. When HA is enabled globally, the placement service replica count is automatically set to 3 (hardcoded for the Raft consensus group). The `dapr_placement.ha` key is not a standard documented Helm value, and `dapr_placement.replicaCount=3` is redundant. Removed both extra flags, keeping only `global.ha.enabled=true`.

## Review Notes
- The Raft consensus mechanism, StatefulSet naming (`dapr-placement-server`), default vs. HA replica counts (1 vs. 3), actor invocation API path, PodDisruptionBudget API version (`policy/v1`), and topology key (`topology.kubernetes.io/zone`) are all correct.
- The expected log messages for leader election ("Raft node is elected as leader", "Placement service is running as leader") are plausible but could not be verified against exact Dapr source code output. Actual log message wording may vary across Dapr versions.
- The resource recommendations are reasonable starting points but are not from official Dapr documentation. The caveat about monitoring and adjusting is appropriate.
- The `--reuse-values` flag in the Helm command is appropriate for upgrades but readers should be aware it preserves all previous custom values, which could cause unexpected behavior on first install.
