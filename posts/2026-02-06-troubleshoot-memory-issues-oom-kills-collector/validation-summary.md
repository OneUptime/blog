# Validation Summary: How to Troubleshoot Memory Issues and OOM Kills in the Collector

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector memory_limiter processor
- OpenTelemetry Collector batch processor
- OpenTelemetry Collector filter and attributes processors
- OpenTelemetry Collector exporter queues and retry settings
- Collector internal telemetry and Prometheus metrics
- Kubernetes resource limits and HorizontalPodAutoscaler
- Docker Compose memory settings
- Go runtime `GOMEMLIMIT` and pprof

## Sources Consulted
- OpenTelemetry Collector memory limiter processor documentation: https://pkg.go.dev/go.opentelemetry.io/collector/processor/memorylimiterprocessor
- OpenTelemetry Collector batch processor documentation: https://pkg.go.dev/go.opentelemetry.io/collector/processor/batchprocessor
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/
- OpenTelemetry Collector scaling documentation: https://opentelemetry.io/docs/collector/scaling/
- OpenTelemetry Collector exporter helper queue and retry documentation: https://pkg.go.dev/go.opentelemetry.io/collector/exporter/exporterhelper
- OpenTelemetry Collector filter processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/filterprocessor/README.md
- OpenTelemetry Collector attributes processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/attributesprocessor/README.md
- OpenTelemetry Collector pprof extension documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/extension/pprofextension/README.md
- OpenTelemetry Collector v0.110.0 changelog for deprecated processor helper metrics: https://github.com/open-telemetry/opentelemetry-collector/releases/tag/v0.110.0

## Issues Found
- The memory limiter section described `spike_limit_mib` as a soft limit percentage. Updated the wording to state that the soft limit is `limit_mib - spike_limit_mib`, matching the upstream memory limiter behavior.
- The Kubernetes example recommended `GOMEMLIMIT` at 90% of the container limit. Updated it to 80% of the hard memory limit guidance used by the upstream memory limiter documentation.
- The Docker example described `oom_kill_disable: false` as preventing OOM kills. Updated the comment to clarify that the kernel OOM killer remains enabled.
- The batch processor example described `send_batch_max_size` as bytes. Updated the comment because this field limits the number of spans, metric data points, or log records and must be greater than or equal to `send_batch_size`.
- The exporter queue section treated `queue_size` as always a number of batches. Updated it to reflect the current `sizer` behavior and added `sizer: requests` to make the example explicit.
- The filter processor example used deprecated `traces.span` configuration and unprefixed `attributes` paths. Updated it to current `trace_conditions` syntax with `span.attributes[...]`.
- The internal telemetry example used `service.telemetry.metrics.address`, which is ignored as of Collector v0.123.0. Replaced it with the current `readers.pull.exporter.prometheus` configuration.
- The high-cardinality section overstated that attributes and transform processors hold mappings in memory. Reworded it to focus on queues, batches, and stateful processors where high-cardinality data has clearer memory impact.
- The metrics list described `otelcol_processor_batch_batch_size_trigger_send` as batch sizes. Replaced it with `otelcol_processor_batch_batch_send_size`, the histogram for batch sizes being sent.
- The metrics list treated `otelcol_processor_refused_spans` as a current primary metric. Updated the description to note that it is deprecated but historically used for processor refusal signals such as memory limiter refusal.

## Review Notes
The post is technically relevant and the examples now align with current OpenTelemetry Collector documentation. Several snippets are illustrative and use placeholder backend endpoints, so they still require environment-specific endpoint, TLS, authentication, and deployment adjustments before production use.
