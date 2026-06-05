# Validation Summary: How to Troubleshoot OOM Kills on Collector Pods When Resource Limits Are Set

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector memory_limiter processor
- OpenTelemetry Collector batch processor
- OpenTelemetry Collector exporter sending queues and persistent queues
- OpenTelemetry Collector file_storage extension
- Kubernetes pods, resource requests, resource limits, and OOMKilled status
- kubectl commands
- Prometheus metrics and PromQL alerts

## Sources Consulted
- OpenTelemetry Collector memory_limiter processor documentation: https://pkg.go.dev/go.opentelemetry.io/collector/processor/memorylimiterprocessor
- OpenTelemetry Collector batch processor documentation: https://pkg.go.dev/go.opentelemetry.io/collector/processor/batchprocessor
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/
- OpenTelemetry Collector exporter helper queue, retry, and persistent queue documentation: https://github.com/open-telemetry/opentelemetry-collector/tree/main/exporter/exporterhelper
- OpenTelemetry Collector file_storage extension documentation: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/extension/storage/filestorage
- Kubernetes memory requests, limits, and OOMKilled documentation: https://kubernetes.io/docs/tasks/configure-pod-container/assign-memory-resource/
- Kubernetes kubectl get reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Kubernetes kubectl events reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_events/

## Issues Found
- The cgroup memory usage command only worked for cgroup v1. I changed it to try `/sys/fs/cgroup/memory.current` first for cgroup v2, then fall back to `/sys/fs/cgroup/memory/memory.usage_in_bytes` for cgroup v1.
- The memory_limiter comments incorrectly implied data rejection starts at `limit_percentage`. I corrected the comments to distinguish the hard memory target from the soft limit, which is calculated as limit minus spike.
- The memory_limiter `check_interval` example used `5s`; the official documentation recommends `1s` as a starting point. I updated the example to `1s`.
- The batch processor text implied `send_batch_size` alone caps batch size. I clarified that reducing and capping batch sizes requires `send_batch_max_size`.
- The sending queue description said the in-memory queue can grow unbounded. The official exporter helper documentation defines a bounded `queue_size`, defaulting to 1000, so I changed the wording to say the queue can fill up to its configured capacity.
- The persistent queue example configured `file_storage` but did not enable the extension under `service.extensions`. I added `service: extensions: [file_storage]`.
- The Collector internal metrics example used `service.telemetry.metrics.address`, which is ignored as of Collector v0.123.0. I replaced it with the current Prometheus pull reader configuration.
- The PromQL alert used `otelcol_processor_refused_spans_total`, but the current internal telemetry documentation lists receiver refusal counters for data that could not be pushed into the pipeline. I changed the alert to `otelcol_receiver_refused_spans_total`.
- The final memory_limiter explanation said it would gracefully drop data before hitting the hard limit. I changed this to describe the documented behavior: refusing data above the soft limit and forcing garbage collection at the hard limit.

## Review Notes
The resource sizing examples are reasonable illustrative starting points, but they are not official sizing guidance. Real deployments should validate them with observed traffic, payload sizes, processor configuration, exporter latency, and Collector internal metrics.
