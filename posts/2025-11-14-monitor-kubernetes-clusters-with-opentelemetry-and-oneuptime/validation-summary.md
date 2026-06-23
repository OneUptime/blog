# Validation Summary: Monitor Kubernetes Clusters with OpenTelemetry and OneUptime

## Status
validated

## Post Type
Tutorial / Guide (multi-signal Kubernetes observability playbook)

## Technologies Covered
- Kubernetes (kubelet, kube-state-metrics, HPA/VPA, cluster-autoscaler)
- OpenTelemetry Collector (DaemonSet via the OpenTelemetry Operator)
- OpenTelemetry receivers/processors/exporters (otlp, kubeletstats, k8s_cluster, filelog, prometheus, k8sattributes, batch, resourcedetection, otlphttp, debug)
- OpenTelemetry Node.js SDK (@opentelemetry/sdk-node, auto-instrumentations, OTLP gRPC trace exporter)
- OneUptime OTLP ingestion, dashboards, SLOs, alerts, workflows
- PromQL / cAdvisor & kube-state-metrics metric series

## Sources Consulted
- OpenTelemetry Collector Contrib processors (cumulativetodelta, deltatocumulative, interval) — https://github.com/open-telemetry/opentelemetry-collector-contrib
- OpenTelemetry Metrics Data Model — https://opentelemetry.io/docs/specs/otel/metrics/data-model/
- kube-state-metrics HorizontalPodAutoscaler metrics docs — https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/workload/horizontalpodautoscaler-metrics.md
- kube-state-metrics node metrics (resource-labeled `kube_node_status_allocatable`/`kube_node_status_capacity`) docs
- OneUptime OTLP endpoint convention (`https://oneuptime.com/otlp`) as used consistently across other validated posts in this repo (e.g. 2025-11-27-instrument-dockerized-apps-with-opentelemetry)

## Issues Found
1. **OTLP exporter endpoint had a doubled path** — The `otlphttp` exporter and the Step 5 prose both pointed to `https://oneuptime.com/otlp/v1`. The Collector's `otlphttp` exporter automatically appends `/v1/traces`, `/v1/metrics`, and `/v1/logs` to the configured `endpoint`, so this would resolve to `…/otlp/v1/v1/traces` and fail. Changed both to the repo-standard base `https://oneuptime.com/otlp` and clarified the auto-appended paths in prose.
2. **Non-existent `delta_tempo` processor** — The troubleshooting tip recommended a `delta_tempo` processor to pre-aggregate histograms. No such processor exists in the Collector. Replaced with the real `interval` processor (re-aggregates metrics over a window before export) and corrected "drop `collection_interval` to 60s" to "raise `collection_interval` to 60s" (raising the interval reduces scrape frequency/CPU).
3. **Outdated HPA metric name** — `kube_hpa_status_current_replicas` was renamed in kube-state-metrics v2.0; the current series is `kube_horizontalpodautoscaler_status_current_replicas`. Updated.
4. **Outdated node allocatable metric in PromQL** — The over-commit ratio example used `kube_node_status_allocatable_memory_bytes`, a pre-v2 per-resource metric removed in kube-state-metrics v2.0. Updated to the current label-based form `kube_node_status_allocatable{resource="memory"}`.

## Review Notes
- **kube-state-metrics v2 label-based families:** Several places still reference pre-v2 wildcard families such as `kube_pod_container_resource_requests_*`, `kube_pod_container_resource_limits_*`, and `kube_node_status_capacity_*`. In kube-state-metrics v2 these collapsed into single metrics with `resource`/`unit` labels (e.g. `kube_pod_container_resource_requests{resource="cpu"}`). They are written as descriptive families rather than concrete queries, so they were left as-is, but readers on KSM v2 should use the label-based form.
- **`http.server.duration`** is the older experimental OTel HTTP metric; the stable HTTP semantic convention metric is `http.server.request.duration`. Many SDKs still emit the older name, so it was left as a valid example, but `http.server.request.duration` is preferred going forward.
- **CRD apiVersion:** `opentelemetry.io/v1alpha1` for `OpenTelemetryCollector` still works but the OpenTelemetry Operator promoted this CRD to `v1beta1`. Newer manifests should prefer `v1beta1`.
- **`kubelet_evictions`** is exposed on the kubelet `/metrics` endpoint (Prometheus scrape), not via the `kubeletstats` receiver (which reads `/stats/summary`). The phrasing "Enable `kubeletstats` eviction metrics" is slightly imprecise; collect `kubelet_evictions` via a Prometheus scrape of the kubelet instead.
- The Node.js SDK snippet, kubeletstats/filelog/k8sattributes/prometheus receiver configs, pipeline wiring, and `kubectl` commands are all syntactically valid and current.
