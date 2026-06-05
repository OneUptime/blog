# Validation Summary: How to Troubleshoot Collector Performance Degradation After Upgrading from

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector Contrib
- Prometheus metrics and PromQL
- Go pprof
- Kubernetes Deployments and kubectl
- Helm

## Sources Consulted
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/
- OpenTelemetry Collector v0.121.0 changelog: https://github.com/open-telemetry/opentelemetry-collector/blob/v0.121.0/CHANGELOG.md
- OpenTelemetry Collector Contrib v0.121.0 changelog: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.121.0/CHANGELOG.md
- OpenTelemetry batch processor documentation: https://pkg.go.dev/go.opentelemetry.io/collector/processor/batchprocessor
- OpenTelemetry pprof extension documentation: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/extension/pprofextension
- OpenTelemetry memory limiter processor documentation: https://github.com/open-telemetry/opentelemetry-collector/blob/v0.121.0/processor/memorylimiterprocessor/README.md
- OpenTelemetry exporter helper documentation: https://github.com/open-telemetry/opentelemetry-collector/blob/v0.121.0/exporter/exporterhelper/README.md
- OpenTelemetry attributes processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.121.0/processor/attributesprocessor/README.md
- OpenTelemetry transform processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.121.0/processor/transformprocessor/README.md
- Kubernetes kubectl set image reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_set/kubectl_set_image/
- Kubernetes Deployment API reference: https://kubernetes.io/docs/reference/kubernetes-api/apps/deployment-v1/
- Helm rollback command reference: https://helm.sh/docs/helm/helm_rollback/

## Issues Found
- The metrics examples used generic Prometheus process metric names and described `otelcol_processor_batch_batch_send_size_bucket` as span processing latency. Updated the examples to use documented Collector internal telemetry names, label the batch metric as batch size distribution, and replace the nonexistent exporter latency metric with exporter queue saturation.
- The Go runtime note implied Go 1.22/1.23 GC behavior was the relevant change for this upgrade. Updated it to the version-specific changelog fact: v0.120.0 added Go 1.24 support and raised the minimum supported Go version to 1.23.
- The Helm rollback example used `helm rollback otel-collector 1` while describing rollback to the previous revision. Changed the command to use `<previous-revision>` because Helm expects the target revision number.
- The canary Deployment snippet omitted the required `spec.selector` and matching pod template labels for `apps/v1`. Added `selector.matchLabels` and matching `template.metadata.labels`.

## Review Notes
The pprof extension, batch processor, memory limiter, attributes processor, transform processor, exporter helper, kubectl image update, and rollout status examples are consistent with the checked documentation. The post title remains incomplete, but that is an editorial issue rather than a technical correctness issue.
