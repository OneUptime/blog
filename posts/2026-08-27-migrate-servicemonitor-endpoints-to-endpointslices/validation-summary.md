# Validation Summary: How to Migrate ServiceMonitor Discovery from Endpoints to EndpointSlices

## Status

validated

## Post Type

Technical migration guide

## Technologies Covered

- Kubernetes Endpoints and EndpointSlice APIs
- Prometheus Kubernetes service discovery and target relabeling
- Prometheus Operator `Prometheus`, `PrometheusAgent`, and `ServiceMonitor` CRDs
- Prometheus Alertmanager endpoint discovery
- Kubernetes RBAC
- `kubectl`

## Sources Consulted

- [Prometheus Operator API reference](https://prometheus-operator.dev/docs/api-reference/api/)
- [Prometheus Operator EndpointSlice migration troubleshooting](https://prometheus-operator.dev/docs/platform/troubleshooting/#v1-endpoints-is-deprecated-in-v133--warning-in-the-operators-logs)
- [Prometheus Operator 0.76.0 changelog](https://github.com/prometheus-operator/prometheus-operator/blob/main/CHANGELOG.md#0760--2024-08-08) and [0.86.0 changelog](https://github.com/prometheus-operator/prometheus-operator/blob/main/CHANGELOG.md#0860--2025-10-07)
- [Prometheus Kubernetes service discovery and relabel configuration](https://prometheus.io/docs/prometheus/latest/configuration/configuration/#kubernetes_sd_config)
- [Prometheus 2.21.0 changelog](https://github.com/prometheus/prometheus/blob/v2.21.0/CHANGELOG.md#2210--2020-09-11)
- [Prometheus 2.35.0 changelog](https://github.com/prometheus/prometheus/blob/v2.35.0/CHANGELOG.md#2350--2022-04-21)
- [Prometheus Targets API](https://prometheus.io/docs/prometheus/latest/querying/api/#targets)
- [Prometheus automatically generated scrape metrics](https://prometheus.io/docs/concepts/jobs_instances/#automatically-generated-labels-and-time-series)
- [Kubernetes Service documentation](https://kubernetes.io/docs/concepts/services-networking/service/)
- [Kubernetes EndpointSlice documentation](https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/)
- [Kubernetes deprecated API migration guide](https://kubernetes.io/docs/reference/using-api/deprecation-guide/)
- [Kubernetes RBAC documentation](https://kubernetes.io/docs/reference/access-authn-authz/rbac/)
- [`kubectl explain`](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_explain/), [`kubectl api-resources`](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_api-resources/), [`kubectl get`](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/), and [`kubectl auth can-i`](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_auth/kubectl_auth_can-i/) references

## Issues Found

- The global `Prometheus.spec.serviceDiscoveryRole` field was described only as the default for inherited ServiceMonitors. It also controls Kubernetes discovery for Alertmanager endpoints configured under `spec.alerting.alertmanagers`, and a per-ServiceMonitor canary does not exercise that path. The RBAC scope, global-rollout warning, and relabel audit now cover Alertmanager endpoint discovery and its custom target `relabelings`.
- The post implied that Prometheus's Targets page exposes `up`, scrape duration, and sample counts together. The page exposes target health and last scrape duration, but scrape sample counts are time series. The verification guidance now uses the Targets page for health and duration and directs readers to query `up`, `scrape_duration_seconds`, and `scrape_samples_scraped` for before-and-after comparisons.

## Review Notes

- Prometheus Operator added the global Prometheus/PrometheusAgent field in 0.76.0 and the per-ServiceMonitor override in 0.86.0. Checking the installed CRD with `kubectl explain`, as the post recommends, remains the safest compatibility test.
- The Kubernetes and Prometheus version boundaries were verified: EndpointSlice is stable and `discovery.k8s.io/v1` is available from Kubernetes 1.21, `v1beta1` stopped being served in Kubernetes 1.25, Prometheus 2.21 introduced EndpointSlice discovery, and Prometheus 2.35 added stable-v1 support.
- The shown `kubectl auth can-i --as=...` checks are valid, but the caller must be authorized to impersonate the specified service account.
- `kubectl get events --sort-by=.lastTimestamp` is valid for core `v1` Events, although `lastTimestamp` is a legacy field and may be empty for some modern events; `.metadata.creationTimestamp` can be a more robust sort key.
- Full attached Node metadata requires the ServiceMonitor `attachMetadata.node` option, Prometheus 2.37 or newer, and Node list/watch RBAC. The EndpointSlice endpoint node-name meta label discussed in the post does not require that option.
