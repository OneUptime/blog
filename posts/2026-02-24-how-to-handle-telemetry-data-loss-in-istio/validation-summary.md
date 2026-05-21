# Validation Summary: How to Handle Telemetry Data Loss in Istio

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Istio telemetry and Envoy sidecars
- Prometheus, PromQL, PrometheusRule, and PodMonitor
- Kubernetes kubectl commands and pod/container status
- OpenTelemetry Collector queues, retry, and file_storage
- Thanos query deduplication

## Sources Consulted
- Istio Prometheus integration documentation: https://istio.io/latest/docs/ops/integrations/prometheus/
- Istio standard metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- Istio sidecar injection and resource annotation documentation: https://istio.io/latest/docs/setup/additional-setup/sidecar-injection/
- Prometheus configuration reference: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Prometheus PromQL operators reference: https://prometheus.io/docs/prometheus/latest/querying/operators/
- Prometheus storage and backfilling documentation: https://prometheus.io/docs/prometheus/latest/storage/
- Prometheus promtool command reference: https://prometheus.io/docs/prometheus/latest/command-line/promtool/
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/
- Kubernetes field selectors and kubectl events documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/ and https://kubernetes.io/docs/reference/kubectl/generated/kubectl_events/
- OpenTelemetry Collector resiliency documentation: https://opentelemetry.io/docs/collector/resiliency/
- Thanos Query documentation: https://thanos.io/tip/components/query.md/

## Issues Found
- The initial `changes(up{job='kubernetes-pods'}[1h])` example was described as finding time series that suddenly stopped reporting, but that PromQL expression detects repeated state changes. Updated the surrounding text and comment to describe scrape target flapping accurately.
- The post stated that Envoy sidecars have memory limits unconditionally. Updated this to say they may have memory limits, because limits depend on injected proxy resource configuration.
- The OOMKilled checks used Kubernetes events filtered by `reason=OOMKilled`, which is not a reliable way to find sidecar OOM terminations. Replaced those commands with pod JSON queries against the `istio-proxy` container's `lastState.terminated.reason`.
- The Prometheus scrape interval was described as 15 seconds by default. Updated the text to note that 15 seconds is common in Kubernetes setups, while Prometheus defaults to 1 minute unless `scrape_interval` is configured.
- The Prometheus storage alert mixed byte metrics with `prometheus_tsdb_head_chunks_created_total`, a counter of created chunks. Replaced it with `prometheus_tsdb_wal_storage_size_bytes` so the numerator uses byte metrics.
- The recovery section said Prometheus does not support backfilling directly. Updated it to clarify that Prometheus cannot recreate missing raw samples, while `promtool tsdb create-blocks-from rules` can backfill historical recording-rule blocks.

## Review Notes
- The PodMonitor example is structurally valid, but it depends on workloads exposing an `http-envoy-prom` pod port. Istio's own documentation also describes annotation-based merged scraping on port 15020 and custom scraping of ports ending in `-envoy-prom`.
- The Prometheus storage alert assumes `prometheus_tsdb_retention_limit_bytes` is available and meaningful, which generally requires size-based retention. Filesystem-level alerts from node or kubelet metrics may be a better production alert in environments without size retention.
