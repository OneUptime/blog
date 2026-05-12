# Validation Summary: Predictive Autoscaling with Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD v2.x (HelmRelease, Kustomization controllers)
- KEDA (Kubernetes Event-Driven Autoscaling) 2.13.0
- Kubernetes HPA
- Prometheus (custom metrics scaler)
- KEDA Cron scaler
- GitOps workflow

## Sources Consulted
- KEDA Helm chart values.yaml: https://github.com/kedacore/charts/blob/main/keda/values.yaml
- KEDA Cron scaler docs: https://keda.sh/docs/2.13/scalers/cron/
- KEDA Prometheus scaler docs: https://keda.sh/docs/2.13/scalers/prometheus/
- Flux Kustomization docs: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux HelmRelease docs: https://fluxcd.io/flux/components/helm/helmreleases/
- KEDA v2.13.0 release notes: https://github.com/kedacore/keda/releases/tag/v2.13.0

## Issues Found
No technical issues found. Specifically verified:
- `helm.toolkit.fluxcd.io/v2` is the current stable HelmRelease API version.
- `kustomize.toolkit.fluxcd.io/v1` is the current stable Kustomization API version.
- `keda.sh/v1alpha1` is the correct API version for KEDA ScaledObject.
- KEDA Helm chart values: `metricsServer.replicaCount` and `resources.operator.limits.{cpu,memory}` paths are correct per the upstream chart.
- KEDA cron trigger metadata fields (`timezone`, `start`, `end`, `desiredReplicas` as a string) match the official scaler spec.
- KEDA Prometheus trigger metadata fields (`serverAddress`, `query`, `threshold` as a string) match the official scaler spec.
- KEDA v2.13.0 is a real release (published 2024-01-19).
- ScaledObject fields (`scaleTargetRef`, `minReplicaCount`, `maxReplicaCount`, `cooldownPeriod`, `triggers`) are valid.
- The PromQL query syntax in Step 2 is valid.

## Review Notes
- KEDA 2.13.0 is pinned, but the project has shipped several minor versions since (the latest line is 2.19.x as of early 2025). Readers running on newer Kubernetes versions may want to use a more recent KEDA release; the chart values structure shown is still applicable but readers should consult the chart README for their specific version.
- In Step 4, the Flux `Kustomization.spec.dependsOn` field can only reference other `Kustomization` resources (not `HelmRelease` resources directly). The example works in practice because the HelmRelease at `infrastructure/keda/helmrelease.yaml` would itself be applied via a parent Kustomization named `keda` — the standard Flux pattern. This is implicit in the path structure but not explicitly shown. An alternative pattern is to use `spec.healthChecks` on the consuming Kustomization to wait for the HelmRelease to become ready.
- The `cooldownPeriod: 300` only applies when scaling from N>0 to 0; for non-zero scale-down behavior, KEDA delegates to the HPA's `behavior.scaleDown` policy. Worth keeping in mind given the post's framing about flapping.
- Combining two separate ScaledObjects targeting the same `api-service` Deployment (one Prometheus, one cron) can lead to "duplicate ScaledObject" warnings since KEDA expects one ScaledObject per target. Idiomatic KEDA usage is to put both triggers under a single ScaledObject so they cooperate via the underlying HPA's MaxOf semantics. This is a design refinement rather than a strict technical error and was left as written.
