# Validation Summary: How to Scrape Multiple Ports and Metrics Paths with One ServiceMonitor

## Status

validated

## Post Type

Technical guide/tutorial

## Technologies Covered

- Prometheus
- Prometheus Operator
- Kubernetes Services, Pods, and EndpointSlices
- ServiceMonitor and PrometheusAgent
- Probe, Blackbox Exporter, and ScrapeConfig
- kubectl, jq, base64, gunzip, and grep

## Sources Consulted

- [Prometheus Operator API reference: ServiceMonitorSpec and Endpoint](https://prometheus-operator.dev/docs/api-reference/api/#monitoring.coreos.com/v1.ServiceMonitorSpec)
- [Prometheus Operator getting started guide](https://prometheus-operator.dev/docs/developer/getting-started/#using-servicemonitors)
- [Prometheus Operator design: config-based resources and selectors](https://prometheus-operator.dev/docs/getting-started/design/#config-based-resources)
- [Prometheus Operator ServiceMonitor troubleshooting](https://prometheus-operator.dev/docs/platform/troubleshooting/#troubleshooting-servicemonitor-changes)
- [Prometheus Operator default ServiceMonitor target labels](https://github.com/prometheus-operator/prometheus-operator/blob/main/Documentation/user-guides/running-exporters.md#default-labels)
- [Prometheus Operator configuration generator source](https://github.com/prometheus-operator/prometheus-operator/blob/1e00daf4e101cbbac959c36f343cc690f6a1aab0/pkg/prometheus/promcfg.go)
- [Prometheus Operator generated Secret source](https://github.com/prometheus-operator/prometheus-operator/blob/1e00daf4e101cbbac959c36f343cc690f6a1aab0/pkg/prometheus/common.go)
- [Prometheus scrape configuration reference](https://prometheus.io/docs/prometheus/latest/configuration/configuration/#scrape_config)
- [Prometheus jobs, instances, and automatically generated scrape series](https://prometheus.io/docs/concepts/jobs_instances/)
- [Prometheus data model](https://prometheus.io/docs/concepts/data_model/)
- [Prometheus Operator ScrapeConfig guide](https://prometheus-operator.dev/docs/developer/scrapeconfig/)
- [Kubernetes Service port definitions](https://kubernetes.io/docs/concepts/services-networking/service/#port-definitions)
- [Kubernetes EndpointSlice ownership and Service labels](https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/#ownership)
- [Kubernetes kubectl get reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/)
- [Prometheus Blackbox Exporter](https://github.com/prometheus/blackbox_exporter)

## Issues Found

- The two endpoint entries using `admin-metrics` originally had identical public target labels because the Operator's default `endpoint` label contains the Service port name, not the HTTP path. This would write exported samples with matching metric names and labels to the same time series and would also merge Prometheus-generated series such as `up` and `scrape_duration_seconds`, even if the application metric names were disjoint. Added distinct constant `metrics_path` target labels to those endpoint entries with `relabelings`.
- The collision warning originally implied that disjoint exported metric names were enough to avoid the problem and described the result as duplicate time series. Updated it to explain that Prometheus writes samples with the same metric name and labels to the same time series, that generated scrape-health series are also affected, and that a distinguishing target label is required for independent path health.

## Review Notes

- The Operator's documented rejection of an invalid `scrapeTimeout` means that it excludes the ServiceMonitor from the generated configuration and emits a Kubernetes Event; it does not necessarily prevent the Kubernetes object from being stored.
- The generated Secret command is correct for a `Prometheus` resource named `platform`. A `PrometheusAgent` uses different generated Secret naming, but the post does not claim otherwise.
- `ScrapeConfig` remains an alpha `v1alpha1` CRD in the current Operator documentation; the post only recommends the use case and does not present a version-specific manifest.
- All YAML snippets and command forms were checked for syntax. Cluster-dependent discovery and target output will vary with the installed Operator, Prometheus, RBAC, and Kubernetes configuration.
