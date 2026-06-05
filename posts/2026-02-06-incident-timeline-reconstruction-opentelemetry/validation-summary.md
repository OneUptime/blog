# Validation Summary: How to Build Incident Timeline Reconstruction from OpenTelemetry Traces, Logs,

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry traces, logs, metrics, and exemplars
- OpenTelemetry Python SDK
- OpenTelemetry Collector
- Collector OTLP receiver, resource processor, groupbytrace processor, batch processor, and OTLP exporter
- Incident timeline reconstruction and observability correlation

## Sources Consulted
- OpenTelemetry Python instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Metrics SDK specification: https://opentelemetry.io/docs/specs/otel/metrics/sdk/
- OpenTelemetry Metrics overview: https://opentelemetry.io/docs/specs/otel/metrics/
- OpenTelemetry trace context in log formats specification: https://opentelemetry.io/docs/specs/otel/compatibility/logging_trace_context/
- OpenTelemetry Collector processor documentation: https://opentelemetry.io/docs/collector/components/processor/
- OpenTelemetry Collector contrib groupbytrace processor documentation: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/processor/groupbytraceprocessor

## Issues Found
- The post claimed OpenTelemetry attaches the same trace ID and span ID to traces, logs, and metrics. Metrics do not generally carry trace IDs as normal metric identity; they can be correlated through resource attributes and exemplars. Updated the wording to distinguish trace/log context from metric correlation.
- The Python logging example used `ConsoleLogExporter`, but current OpenTelemetry Python documentation uses `ConsoleLogRecordExporter` for recent SDK versions. Updated the import and processor setup.
- The Collector section implied `groupbytrace` grouped logs and spans. Official Collector processor documentation lists `groupbytrace` as a trace processor, and the sample only used it in the traces pipeline. Updated the description and comment to say it groups spans by trace ID, and clarified that it is available in Collector contrib and Kubernetes distributions.
- The metrics example used `time.time()` without importing `time`, and did not initialize a `MeterProvider` or metric reader before recording metrics. Added the missing import and minimal metric SDK setup using `PeriodicExportingMetricReader` and `ConsoleMetricExporter`, matching the official Python documentation.
- The metrics example said the SDK automatically attaches exemplars with trace context. The OpenTelemetry Metrics SDK specification defines trace-based exemplar filtering for measurements recorded in sampled span context, but exemplar attachment is sampling/configuration dependent. Updated the comment to state this more accurately.

## Review Notes
The timeline query is intentionally pseudocode and remains backend-specific. The post does not specify exact backend query APIs, so those helper functions were reviewed as illustrative rather than executable code.
