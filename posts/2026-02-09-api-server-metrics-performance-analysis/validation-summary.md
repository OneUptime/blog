# Validation Summary: How to Query Kubernetes API Server Metrics for Performance Analysis

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes API server metrics
- kubectl
- Prometheus metrics and histograms
- Prometheus Operator ServiceMonitor
- Grafana dashboards
- etcd metrics
- Kubernetes API Priority and Fairness
- Kubernetes admission webhooks

## Sources Consulted
- Kubernetes Metrics Reference: https://kubernetes.io/docs/reference/instrumentation/metrics/
- Kubernetes Metrics for System Components: https://kubernetes.io/docs/concepts/cluster-administration/system-metrics/
- Kubernetes API Priority and Fairness: https://kubernetes.io/docs/concepts/cluster-administration/flow-control/
- kubectl get reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Prometheus histograms and summaries: https://prometheus.io/docs/practices/histograms/
- Prometheus histogram_quantile function: https://prometheus.io/docs/prometheus/latest/querying/functions/#histogram_quantile
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/

## Issues Found
- The post treated Kubernetes histogram metrics such as `apiserver_request_duration_seconds`, `etcd_request_duration_seconds`, and `apiserver_admission_webhook_admission_duration_seconds` as if they exposed direct `quantile="0.99"` samples. Kubernetes exposes these as Prometheus histograms, so direct `/metrics` output has `_bucket`, `_sum`, and `_count` samples. I replaced the raw `quantile` greps with bucket-based threshold examples and left p99 tracking for Prometheus/Grafana.
- The `apiserver_current_inflight_requests` examples used the stale `kind` label. Current Kubernetes documents the label as `request_kind`, so the examples and monitoring script were updated.
- The `apiserver_request_total` examples omitted current stable labels and used lowercase verbs. I updated the examples to match the documented labels and uppercase verb values.
- The request-count sorting command sorted by label text rather than the numeric sample value. I changed it to sort by the second whitespace-delimited field.
- The post claimed `apiserver_request_total` could be filtered by a `client` label. Current Kubernetes documents no such stable label, so I replaced that section with `authenticated_user_requests`, which is documented as a counter by username.
- The watch metrics section referenced `apiserver_registered_watchers` and `apiserver_watch_terminated_total`, which are not in the current metrics reference. I replaced them with `apiserver_longrunning_requests`, `apiserver_watch_events_total`, and `apiserver_watch_cache_events_dispatched_total`.
- The Prometheus Operator `ServiceMonitor` example selected API server labels but did not set `namespaceSelector`; without it, a ServiceMonitor only selects Services in its own namespace. I added `namespaceSelector.matchNames: [default]` for the default Kubernetes API Service.

## Review Notes
The post is technically valid after fixes. Direct `kubectl get --raw /metrics` analysis is useful for spot checks, but percentile latency dashboards should use Prometheus queries such as `histogram_quantile()` over `_bucket` series rather than trying to compute p99 from a single raw scrape.
