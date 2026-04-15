# Validation Summary: How to Configure Dapr for Production on Kubernetes

## Status
validated

## Post Type
Guide

## Technologies Covered
- Dapr 1.13.x
- Kubernetes
- Helm
- Zipkin (observability/tracing)
- mTLS (mutual TLS)
- PodDisruptionBudget

## Sources Consulted
- Dapr Helm chart source (`dapr/dapr` GitHub repository, `charts/dapr/values.yaml` and `charts/dapr/Chart.yaml` at v1.13.0) — https://github.com/dapr/helm-charts
- Dapr Kubernetes production deployment docs — https://docs.dapr.io/operations/hosting/kubernetes/kubernetes-production/
- Dapr Kubernetes deployment docs — https://docs.dapr.io/operations/hosting/kubernetes/kubernetes-deploy/
- Dapr Configuration CRD reference — https://docs.dapr.io/operations/configuration/configuration-overview/
- Dapr mTLS documentation — https://docs.dapr.io/operations/security/mtls/
- Dapr Dashboard Helm chart (separate chart) — https://github.com/dapr/dashboard
- Kubernetes PodDisruptionBudget API reference (policy/v1 stable since K8s 1.21)

## Issues Found

### 1. mTLS Helm values missing `global.` prefix
- **What was wrong:** The mTLS configuration (`mtls.enabled`, `mtls.workloadCertTTL`, `mtls.allowedClockSkew`) was placed as a top-level `mtls:` key in the Helm values file. The correct path is under the `global:` key: `global.mtls.enabled`, `global.mtls.workloadCertTTL`, `global.mtls.allowedClockSkew`.
- **What was changed:** Moved the mTLS settings under the existing `global:` block, alongside the `ha:` settings.
- **Why:** Without the `global.` prefix, Helm would ignore these values and mTLS would use defaults, potentially leaving workload certificate TTL and clock skew at their default values rather than the intended production settings.

### 2. `dapr_dashboard` is not a subchart of `dapr/dapr`
- **What was wrong:** The values file included a `dapr_dashboard` section with `enabled: true` and `replicaCount: 1`. The Dapr Dashboard is a separate Helm chart (`dapr/dapr-dashboard`) and is not a subchart of the main `dapr/dapr` chart. This section would be silently ignored by Helm.
- **What was changed:** Removed the `dapr_dashboard` section entirely from the values file.
- **Why:** Including a non-existent subchart key gives the false impression that the dashboard is being configured, when in reality it has no effect. The dashboard must be installed separately via `helm install dapr-dashboard dapr/dapr-dashboard`.

## Review Notes
- The Dapr Helm chart natively supports PodDisruptionBudgets via `global.ha.disruption.minimumAvailable` and `global.ha.disruption.maximumUnavailable` values. The manual PDB manifest shown in the post works but is redundant if using the built-in Helm values.
- The `kubectl patch` command for mTLS cert lifetime is technically correct, but official Dapr docs recommend following up with a rolling restart of affected workloads for the new settings to take effect.
- The PDB uses `policy/v1` which requires Kubernetes 1.21+. This is appropriate for Dapr 1.13.x but worth noting for readers on older clusters.
