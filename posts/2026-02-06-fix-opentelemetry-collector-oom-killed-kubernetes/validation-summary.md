# Validation Summary: How to Fix OpenTelemetry Collector OOM Killed Errors in Kubernetes

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector memory limiter processor
- OpenTelemetry Collector batch processor
- OpenTelemetry Collector exporter sending queue and retry settings
- Kubernetes Deployments, Services, resource requests, and memory limits
- Go runtime `GOMEMLIMIT` and `GOGC`
- Prometheus alerting rules and PromQL

## Sources Consulted
- OpenTelemetry Collector memory limiter processor documentation: https://pkg.go.dev/go.opentelemetry.io/collector/processor/memorylimiterprocessor
- OpenTelemetry Collector batch processor documentation: https://pkg.go.dev/go.opentelemetry.io/collector/processor/batchprocessor
- OpenTelemetry Collector exporter helper documentation: https://pkg.go.dev/go.opentelemetry.io/collector/exporter/exporterhelper
- OpenTelemetry Collector processor component list: https://opentelemetry.io/docs/collector/components/processor/
- OpenTelemetry Collector Helm chart defaults: https://opentelemetry.io/docs/platforms/kubernetes/helm/collector/
- Kubernetes memory request and limit documentation: https://kubernetes.io/docs/tasks/configure-pod-container/assign-memory-resource/
- Go 1.19 release notes for `GOMEMLIMIT`: https://go.dev/doc/go1.19
- Go `runtime/debug.SetMemoryLimit` documentation: https://go.dev/pkg/runtime/debug/
- Prometheus vector matching documentation: https://prometheus.io/docs/prometheus/latest/querying/operators/

## Issues Found
- The post said exit code 137 specifically means an out-of-memory kill. I narrowed this to the `OOMKilled` pod-status context because exit code 137 generally means SIGKILL, while Kubernetes reports `OOMKilled` when the kill was due to memory.
- The memory limiter processor was described as checking memory on every batch and using the soft limit to trigger garbage collection. I corrected this to periodic memory checks, data refusal at the soft limit, and forced garbage collection at the hard limit.
- The memory limiter overhead explanation implied the processor does not track Go runtime/internal memory in a broad way. I adjusted this to match the documented behavior more closely: `limit_mib` targets the Go heap/process allocation view, and room is needed for process memory outside that target plus allocations between checks.
- The batch processor example treated `send_batch_size` as a hard maximum batch size. I corrected the text to explain that `send_batch_size` is a trigger, while `send_batch_max_size` enforces an outbound maximum.
- The exporter queue comments incorrectly stated that total queued items equal `num_consumers * queue_size`. I corrected this because `queue_size` is the queue capacity, while `num_consumers` controls export concurrency.
- The post used `GOMEMLIMIT` at 90% of the Kubernetes memory limit. I changed the example and cheat sheet to 80%, aligning it with current OpenTelemetry Collector memory limiter best-practice guidance.
- The PromQL memory alert divided two raw vectors that may not share identical label sets. I changed the expression to aggregate both sides by `namespace`, `pod`, and `container` before division.

## Review Notes
- The snippets use `otel/opentelemetry-collector-contrib:latest`, which is valid but not ideal for production because it makes collector behavior version-dependent. Pinning a tested collector version would be safer in a future revision.
- The exporter queue defaults and memory limiter recommendations are current as of this validation date, but both are version-sensitive Collector behavior and should be rechecked when upgrading Collector releases.
