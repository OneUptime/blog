# Validation Summary: How to Monitor Probe Failures with Prometheus and Kubernetes Events

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes probes and events
- Kubernetes kubelet metrics
- kube-state-metrics
- Prometheus and PromQL
- Prometheus Operator PrometheusRule
- Grafana dashboards
- Python prometheus_client
- Go client-go

## Sources Consulted
- Kubernetes documentation: Liveness, Readiness, and Startup Probes - https://kubernetes.io/docs/concepts/workloads/pods/probes/
- Kubernetes Metrics Reference - https://kubernetes.io/docs/reference/instrumentation/metrics/
- Kubernetes Events API v1 - https://kubernetes.io/docs/reference/kubernetes-api/events/event-v1/
- Kubernetes API deprecation guide for Events - https://kubernetes.io/docs/reference/using-api/deprecation-guide/
- kube-state-metrics README and metrics documentation - https://github.com/kubernetes/kube-state-metrics
- kube-state-metrics Pod metrics documentation - https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/workload/pod-metrics.md
- kube-state-metrics EndpointSlice metrics documentation - https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/service/endpointslice-metrics.md
- Prometheus configuration documentation - https://prometheus.io/docs/operating/configuration/
- Prometheus query functions documentation - https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus Python client documentation - https://prometheus.github.io/client_python/instrumenting/

## Issues Found
- The post incorrectly stated that Kubernetes Events feed into kube-state-metrics and that kube-state-metrics exports probe status. Updated the explanation to distinguish kubelet probe metrics, Kubernetes Events, and kube-state-metrics object-state metrics.
- The kube-state-metrics deployment used an outdated image and less accurate health endpoints. Updated the image to `v2.18.0`, changed probes to `/livez` and `/readyz`, and enabled the resources used by the examples.
- The Prometheus scrape configuration did not scrape kubelet `/metrics/probes`, so the direct probe metrics used later would not be available. Added a kubelet probe scrape job through the API server node proxy.
- Probe failure alerts used kube-state-metrics readiness and restart metrics as direct probe failure signals. Updated readiness, liveness, startup, and slow-probe alerts to use kubelet `prober_probe_total` and `prober_probe_duration_seconds_bucket` metrics.
- The probe result label value was corrected to `result="failed"` for kubelet probe counters.
- The service endpoint alert used `kube_endpoint_address_available`, which has been removed from recent kube-state-metrics releases. Updated it to use EndpointSlice metrics.
- The Go event monitor used unused imports, the older core/v1 Event API, and did not handle a closed watch channel. Updated it to use `events.k8s.io/v1`, removed unused imports, switched to `EventsV1()`, used `Regarding` and `Note`, and handled watch channel closure.
- The Grafana probe duration panel referenced an application metric while describing probe monitoring. Updated it to use kubelet probe duration buckets.

## Review Notes
- The EndpointSlice alert derives the service name from generated EndpointSlice names. This works for standard Service-managed EndpointSlices, but production dashboards can be more robust by allowing the `kubernetes.io/service-name` EndpointSlice label in kube-state-metrics and joining on that label.
- The kubelet scrape job assumes the Prometheus service account is authorized to access node proxy metrics through the Kubernetes API server.
