# Validation Summary: Monitoring Cilium Endpoint CRD Resources in Production

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Cilium
- CiliumEndpoint custom resources
- Kubernetes
- Helm
- Prometheus and Prometheus Operator ServiceMonitor
- Grafana
- Hubble
- Bash, kubectl, jq, and PromQL

## Sources Consulted
- Cilium Monitoring & Metrics documentation: https://docs.cilium.io/en/stable/observability/metrics/
- Cilium Helm values reference: https://docs.cilium.io/en/stable/helm-values/
- Cilium Endpoint CRD documentation: https://docs.cilium.io/en/stable/network/kubernetes/ciliumendpoint.html
- Cilium Endpoint Lifecycle documentation: https://docs.cilium.io/en/stable/security/policy/lifecycle/
- Cilium Hubble CLI documentation: https://docs.cilium.io/en/latest/observability/hubble/hubble-cli/
- Cilium Hubble setup documentation: https://docs.cilium.io/en/stable/observability/hubble/setup/

## Issues Found
- The introduction said CiliumEndpoint resources represent every network endpoint in the cluster. Cilium documents one CiliumEndpoint per pod managed by Cilium, so the wording was corrected to "every pod managed by Cilium."
- The endpoint regeneration histogram query used `histogram_quantile()` directly on per-series bucket rates. It was changed to aggregate buckets with `sum by (le)` before calculating the quantile.
- The regeneration count example used `rate()` without grouping by outcome. It was changed to `sum by (outcome)` so the query matches the stated "by outcome" purpose.
- The Hubble metrics Helm values enabled metrics but did not enable a ServiceMonitor, while the guide otherwise configures Prometheus Operator ServiceMonitor discovery. Added `hubble.metrics.serviceMonitor.enabled` and matching labels.
- The regeneration failure alert compared an unaggregated vector directly to zero. It was changed to aggregate the failure rate with `sum(...) > 0`.

## Review Notes
- The Cilium stable documentation for 1.19 uses the `state` label on `cilium_endpoint_state`; Cilium 1.20 development documentation shows label changes for endpoint metrics. This guide targets Cilium v1.14+ and is accurate for the current stable documentation reviewed.
- The custom pod-to-endpoint gap script is a reasonable consistency check, but production users may need to account for unmanaged pods or workloads outside Cilium's control.
