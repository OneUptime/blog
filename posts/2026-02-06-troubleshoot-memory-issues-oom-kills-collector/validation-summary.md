# Validation Summary: How to Troubleshoot Memory Issues and OOM Kills in the Collector

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector processors: memory_limiter, batch, attributes, filter
- OpenTelemetry Collector exporters and sending queues
- OpenTelemetry Collector internal telemetry
- pprof and zpages Collector extensions
- Kubernetes deployments and Horizontal Pod Autoscaler
- Docker Compose memory limits
- Go runtime GOMEMLIMIT

## Sources Consulted
- OpenTelemetry Collector memory_limiter processor documentation: https://github.com/open-telemetry/opentelemetry-collector/blob/main/processor/memorylimiterprocessor/README.md
- OpenTelemetry Collector batch processor documentation: https://github.com/open-telemetry/opentelemetry-collector/blob/main/processor/batchprocessor/README.md
- OpenTelemetry Collector exporterhelper sending queue documentation: https://github.com/open-telemetry/opentelemetry-collector/blob/main/exporter/exporterhelper/README.md
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/
- OpenTelemetry Collector filter processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/filterprocessor/README.md
- OpenTelemetry Collector attributes processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/attributesprocessor/README.md
- OpenTelemetry Collector pprof extension documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/extension/pprofextension/README.md
- OpenTelemetry Collector zpages extension documentation: https://github.com/open-telemetry/opentelemetry-collector/blob/main/extension/zpagesextension/README.md
- Go runtime documentation for GOMEMLIMIT: https://pkg.go.dev/runtime
- Docker Compose CLI help for `docker compose up --scale`

## Issues Found
- The memory limiter section described `spike_limit_mib` as the soft limit and called `limit_mib: 1536` 80% of a 2 GiB limit. Updated the comments and explanation so `limit_mib` is the hard limit, `spike_limit_mib` is the difference between hard and soft limits, and the example soft limit is 1024 MiB.
- The Kubernetes `GOMEMLIMIT` example used 90% of the container limit, while the Collector memory limiter docs recommend 80% of the hard memory limit. Updated the value to `3277MiB` for a 4 GiB limit.
- The Docker Compose OOM comment claimed `oom_kill_disable: false` prevents OOM killing. Updated the comment to state that the kernel OOM killer remains enabled.
- The batch processor section described `send_batch_max_size` as bytes. Updated it to number of spans, metric data points, or log records, matching the batch processor docs.
- The exporter queue sizing explanation assumed `queue_size` was always batches and used an incorrect memory formula. Added `sizer: requests` and changed the explanation to estimate memory from average queued request size.
- The filter processor example used the older nested `traces.span` syntax. Updated it to current documented `trace_conditions` syntax with OTTL span attribute paths.
- The Collector internal telemetry example used `service.telemetry.metrics.address`, which is no longer the current documented configuration style for customized internal metrics readers. Replaced it with `readers.pull.exporter.prometheus` and added `without_type_suffix` and `without_units` so the metric names listed in the post remain accurate.
- The metrics list described `otelcol_processor_refused_spans` as a direct memory-limiter metric. Clarified that it is a deprecated processor counter for spans rejected by the next component in the pipeline, and noted that exporter queue size metrics apply when queue metrics are enabled.

## Review Notes
The OpenTelemetry Collector binary was not installed locally, so configuration validation was performed against current official documentation and source metadata rather than by running `otelcol --config`. The post uses `latest` container tags for examples; pinning a Collector version would make future validation and reproducibility stronger.
