# Validation Summary: How to Configure OpenTelemetry for Edge Computing

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector Contrib processors and extensions
- OTLP/HTTP exporter
- OpenTelemetry JavaScript SDK
- OpenTelemetry Python SDK
- Kubernetes Deployment resource limits
- Bash connectivity checks

## Sources Consulted
- OpenTelemetry Collector filter processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/filterprocessor/README.md
- OpenTelemetry Collector file storage extension documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/extension/storage/filestorage
- OpenTelemetry Collector metrics transform processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/metricstransformprocessor/README.md
- OpenTelemetry Collector cumulative-to-delta processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/cumulativetodeltaprocessor/README.md
- OpenTelemetry Collector resiliency documentation: https://opentelemetry.io/docs/collector/resiliency/
- OpenTelemetry JavaScript NodeSDK API documentation: https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_sdk-node.html
- OpenTelemetry JavaScript package metadata and type definitions for @opentelemetry/exporter-trace-otlp-http, @opentelemetry/otlp-exporter-base, @opentelemetry/resources, and @opentelemetry/sdk-trace-base from npm
- OpenTelemetry Python SDK trace export documentation: https://opentelemetry-python.readthedocs.io/en/latest/sdk/trace.export.html
- OpenTelemetry Python OTLP exporter documentation: https://opentelemetry-python.readthedocs.io/en/latest/exporter/otlp/otlp.html
- Kubernetes Deployment documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/

## Issues Found
- The Collector filter processor used the older nested `traces.span` and `metrics.metric` style. Updated it to the current `trace_conditions` and `metric_conditions` OTTL format with explicit `span.` and `metric.` paths.
- The JavaScript resource example used `new Resource(...)`, which is no longer exported as a public constructor by the current `@opentelemetry/resources` package. Updated it to `resourceFromAttributes(...)`.
- The JavaScript NodeSDK example used the deprecated singular `spanProcessor` option. Updated it to `spanProcessors: [spanProcessor]`.
- The JavaScript compression example imported `CompressionAlgorithm` from `@opentelemetry/exporter-trace-otlp-http`, but the current package exports only `OTLPTraceExporter`. Updated the import to use `@opentelemetry/otlp-exporter-base`.
- The file storage examples enabled compaction but did not set `create_directory` or a compaction directory in the main edge collector config. Added `create_directory: true` and a compaction directory so the examples can start cleanly on new edge hosts.
- The metric aggregation section incorrectly described converting histograms to summaries and used an incomplete label deletion example. Reworded the comment and changed the operation to `aggregate_labels` with `label_set` and `aggregation_type`, matching the metrics transform processor documentation.
- The delta metric section incorrectly placed delta behavior on the OTLP HTTP exporter as `metrics_encoding: delta`, which is not an OTLP HTTP exporter option. Replaced it with the `cumulativetodelta` processor configuration.
- The central collector config described `groupbyattrs` as deduplicating retry storms by `trace_id` and `span_id`. The processor groups telemetry by attributes and does not deduplicate spans, so the inaccurate block was removed.
- The Kubernetes Deployment example was missing the required `spec.selector` and matching pod template labels. Added both.
- The Kubernetes image used the core Collector image while the post relies on Contrib components such as file storage, metrics transform, and cumulative-to-delta. Updated it to `otel/opentelemetry-collector-contrib:latest`.

## Review Notes
The examples are version-sensitive because several Collector components used here are Contrib components and some are not available in the core Collector distribution. For production, pin the Collector image to a tested version instead of using `latest`, and size the `memory_limiter` below the container memory limit to leave headroom.
