# Validation Summary: Preventing Identity-Relevant Labels Configuration in Cilium Performance

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Cilium
- Kubernetes
- Helm
- Prometheus Operator
- Flux HelmRelease
- iperf3
- netperf
- Bash

## Sources Consulted
- Cilium documentation: Limiting Identity-Relevant Labels, https://docs.cilium.io/en/stable/operations/performance/scalability/identity-relevant-labels/
- Cilium documentation: Monitoring & Metrics, https://docs.cilium.io/en/stable/observability/metrics/
- Cilium documentation: Command Reference, https://docs.cilium.io/en/stable/cmdref/
- Cilium documentation: Security Identities, https://docs.cilium.io/en/stable/internals/security-identities/
- Cilium documentation: Cilium Operator identity allocation, https://docs.cilium.io/en/stable/internals/cilium_operator/
- Flux documentation: HelmRelease API, https://fluxcd.io/flux/components/helm/helmreleases/

## Issues Found
- The Helm `labels` example used `k8s:`-prefixed identity labels. Cilium's identity-relevant `labels` setting expects space-separated regular expression patterns for label keys, so the example was changed to `app io\\.kubernetes\\.pod\\.namespace io\\.cilium\\.k8s\\.policy`.
- The post used `cilium identity list`, which is not part of the standalone Cilium Kubernetes CLI command reference. The examples now count `ciliumidentities.cilium.io`, the default CRD-backed identity resource in Kubernetes deployments.
- The Prometheus alert used `cilium_identity_count`, but Cilium documents the identity metric as `cilium_identity`. The alert expression was changed to `max(cilium_identity) > 10000` to avoid summing the same cluster-wide count across multiple scraped agents.
- The Flux HelmRelease example pinned Cilium to `1.14.x`, which is old for a post validated in 2026. It was updated to `1.19.x`, matching the current stable documentation consulted during review.

## Review Notes
The examples assume CRD-backed identity allocation, which Cilium documents as the default behavior for Kubernetes deployments. Clusters using kvstore-backed identities may need a different identity-count command.
