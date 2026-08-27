# Validation Summary: Why ServiceMonitor Cannot Probe Arbitrary URLs

## Status
validated

## Post Type
Technical guide

## Technologies Covered

- Prometheus
- Prometheus Operator
- Kubernetes
- `ServiceMonitor` CRD
- `Probe` CRD
- `ScrapeConfig` CRD
- Prometheus Blackbox Exporter
- `kubectl`

## Sources Consulted

- [Prometheus Operator API reference: `Probe`](https://prometheus-operator.dev/docs/api-reference/api/#monitoring.coreos.com/v1.Probe)
- [Prometheus Operator API reference: `ServiceMonitor`](https://prometheus-operator.dev/docs/api-reference/api/#monitoring.coreos.com/v1.ServiceMonitor)
- [Prometheus Operator API reference: `Prometheus`](https://prometheus-operator.dev/docs/api-reference/api/#monitoring.coreos.com/v1.Prometheus)
- [Prometheus Operator API reference: `PrometheusAgent`](https://prometheus-operator.dev/docs/api-reference/api/#monitoring.coreos.com/v1alpha1.PrometheusAgent)
- [Prometheus Operator API reference: `ScrapeConfig`](https://prometheus-operator.dev/docs/api-reference/api/#monitoring.coreos.com/v1alpha1.ScrapeConfig)
- [Prometheus Operator design: config-based resources and selectors](https://prometheus-operator.dev/docs/getting-started/design/#config-based-resources)
- [Prometheus Operator ScrapeConfig guide](https://prometheus-operator.dev/docs/developer/scrapeconfig/)
- [Prometheus Operator troubleshooting: rejected monitoring resources](https://prometheus-operator.dev/docs/platform/troubleshooting/#debugging-why-monitoring-resource-spec-changes-are-not-reconciled)
- [Prometheus guide: multi-target exporter pattern](https://prometheus.io/docs/guides/multi-target-exporter/)
- [Prometheus Blackbox Exporter README](https://github.com/prometheus/blackbox_exporter/blob/master/README.md)
- [Prometheus Blackbox Exporter configuration reference](https://github.com/prometheus/blackbox_exporter/blob/master/CONFIGURATION.md)
- [Kubernetes `kubectl get` reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/)
- [Kubernetes field selectors](https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/)
- [Kubernetes core/v1 Event API](https://kubernetes.io/docs/reference/kubernetes-api/core/event-v1/)

## Issues Found
No technical issues found.

## Review Notes

- The `Probe` manifest uses the current `monitoring.coreos.com/v1` API and valid fields. Its timeout is shorter than its interval, `prober.url` correctly omits the scheme, and `/probe` is the documented default path.
- The static target list and Ingress-discovery explanation match the current API. The Operator documents that `staticConfig` takes precedence if both target modes are present.
- The selector semantics are correct. For the shown selector to select the example Probe, its `monitoring` Namespace must carry the label `observability: enabled`.
- Upstream still serves `ScrapeConfig` as `monitoring.coreos.com/v1alpha1`, and the post appropriately tells readers to confirm the version installed in their cluster.
- Blackbox Exporter's `/metrics` endpoint reports exporter metrics, while `/probe` performs a target probe. A successful scrape does not imply `probe_success == 1`, so the post's validation guidance is correct.
- The `kubectl` commands use valid resource names, output flags, Event field selectors, and sort syntax. Kubernetes Events are best-effort and may expire, so the additional selector and Prometheus target checks remain important.
