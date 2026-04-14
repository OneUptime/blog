# Validation Summary: How to Use Dapr with Kubernetes Pod Disruption Budgets

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes Pod Disruption Budgets (PDB) — `policy/v1` API
- Dapr (Distributed Application Runtime) sidecar annotations and control plane
- kubectl CLI (apply, get, cordon, drain, describe)
- Kubernetes Deployments (`apps/v1`)

## Sources Consulted
- Kubernetes official documentation on Pod Disruption Budgets: https://kubernetes.io/docs/tasks/run-application/configure-pdb/
- Kubernetes API reference for PodDisruptionBudget `policy/v1`: https://kubernetes.io/docs/reference/kubernetes-api/policy-resources/pod-disruption-budget-v1/
- Dapr Kubernetes annotations reference: https://docs.dapr.io/reference/arguments-annotations-overview/
- Dapr Helm chart for placement service labels: https://github.com/dapr/dapr/tree/master/charts/dapr
- kubectl drain documentation: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_drain/

## Issues Found
1. **Incorrect field name and value in `kubectl describe pdb` comment**: The comment said `Disruptions Allowed: 1` but the actual field name in kubectl output is `Allowed disruptions`. Additionally, with 3 replicas and `minAvailable: 1`, the allowed disruptions should be 2 (3 healthy − 1 minimum = 2 allowed), not 1. Fixed to `Allowed disruptions: 2`.

## Review Notes
- All YAML manifests use the GA `policy/v1` API version, which is correct for Kubernetes 1.21+. The deprecated `policy/v1beta1` was removed in Kubernetes 1.25.
- The `--delete-emptydir-data` flag on `kubectl drain` is the correct current flag; the older `--delete-local-data` alias was deprecated.
- The Dapr sidecar annotations (`dapr.io/enabled`, `dapr.io/app-id`, `dapr.io/app-port`) are all current and correctly formatted.
- The Dapr placement service label `app: dapr-placement-server` matches the default Dapr Helm chart.
- The post could benefit from mentioning `maxUnavailable` as an alternative to `minAvailable`, but this is a content suggestion, not a correctness issue.
