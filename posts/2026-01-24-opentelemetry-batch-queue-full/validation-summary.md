# Validation Summary: How to Fix 'Batch Queue Full' Collector Errors

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector processors, exporters, receivers, and extensions
- OpenTelemetry Python SDK
- OpenTelemetry Go metrics API
- Prometheus alerting rules
- Kubernetes Deployment and Service manifests
- Docker and kubectl operational commands

## Sources Consulted
- OpenTelemetry Collector Resiliency documentation: https://opentelemetry.io/docs/collector/resiliency/
- OpenTelemetry Collector Internal Telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/
- OpenTelemetry Collector exporter helper documentation: https://github.com/open-telemetry/opentelemetry-collector/blob/main/exporter/exporterhelper/README.md
- OpenTelemetry Collector memory limiter processor documentation: https://github.com/open-telemetry/opentelemetry-collector/blob/main/processor/memorylimiterprocessor/README.md
- OpenTelemetry Collector filter processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/filterprocessor/README.md
- OpenTelemetry Collector health check extension documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/extension/healthcheckextension/README.md
- OpenTelemetry Collector file storage extension documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/extension/storage/filestorage/README.md
- OpenTelemetry Collector batch processor documentation: https://github.com/open-telemetry/opentelemetry-collector/blob/main/processor/batchprocessor/README.md
- OpenTelemetry Collector OTLP receiver config documentation: https://github.com/open-telemetry/opentelemetry-collector/blob/main/receiver/otlpreceiver/config.md
- OpenTelemetry Python SDK BatchSpanProcessor documentation/source: https://opentelemetry-python.readthedocs.io/en/latest/sdk/trace.export.html
- OpenTelemetry Python OTLP exporter documentation: https://opentelemetry-python.readthedocs.io/en/latest/exporter/otlp/otlp.html

## Issues Found
- The pipeline diagram placed the batch processor before filtering, while the production config and Collector guidance put memory limiting first and batching after filtering/sampling. Updated the diagram order.
- The post described a Collector "batch queue full" processor error and listed a processor dropped-spans metric that is not a current internal metric. Replaced the example with exporter sending queue errors and current queue/enqueue/refused metrics.
- The internal telemetry examples used `service.telemetry.metrics.address`, which is ignored as of Collector v0.123.0. Replaced it with the current Prometheus reader configuration.
- The filter processor examples used deprecated legacy `spans.exclude.match_type/span_names/attributes` syntax. Replaced them with current OTTL `trace_conditions`.
- The persistent queue example described `file_storage.timeout` as a maximum storage size. Corrected the comment to file lock timeout.
- The Python backpressure example subclassed `BatchSpanProcessor` and accessed private/nonexistent queue attributes incorrectly. Replaced it with supported `BatchSpanProcessor` configuration and guidance to use source sampling or throughput fixes for sustained pressure.
- The collector-side backpressure config included obsolete/invalid `memory_limiter.ballast_size_mib` and the health check extension's problematic `check_collector_pipeline` configuration. Removed those fields.
- The OTLP receiver example used `read_buffer_size: 512KB`, but the Collector expects an integer byte count. Changed it to `524288`.
- The Prometheus alert examples referenced `_total` suffixed metrics while the post config sets `without_type_suffix: true`. Updated the alert expressions to match the configured metric names.
- The Go metrics snippet imported unused `context` and `time` packages. Removed the unused imports.

## Review Notes
- I validated representative Collector configurations with `otel/opentelemetry-collector-contrib:latest` version `0.153.0` using the `validate` subcommand.
- The post remains intentionally generic and does not pin a Collector version. Some internal telemetry names and schemas can change across Collector releases, so production deployments should verify against their deployed Collector version.
