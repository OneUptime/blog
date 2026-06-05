# Validation Summary: How to Reduce Telemetry Data Volume with Span Suppression Strategies

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- OpenTelemetry tracing
- OpenTelemetry Python SDK
- OpenTelemetry Go SDK
- OpenTelemetry Java SDK
- OpenTelemetry Collector
- Collector filter processor and OTTL
- Collector transform processor and OTTL
- Collector span metrics connector
- OTLP exporters

## Sources Consulted
- OpenTelemetry Trace SDK specification: https://opentelemetry.io/docs/specs/otel/trace/sdk/
- OpenTelemetry Python SDK trace export documentation: https://opentelemetry-python.readthedocs.io/en/latest/sdk/trace.export.html
- OpenTelemetry Python SDK trace documentation: https://opentelemetry-python.readthedocs.io/en/latest/sdk/trace.html
- OpenTelemetry Go SDK trace package documentation: https://pkg.go.dev/go.opentelemetry.io/otel/sdk/trace
- OpenTelemetry Java `ReadWriteSpan` Javadoc: https://javadoc.io/static/io.opentelemetry/opentelemetry-sdk-trace/1.56.0/io/opentelemetry/sdk/trace/ReadWriteSpan.html
- OpenTelemetry Java exporter documentation: https://opentelemetry.io/docs/languages/java/exporters/
- OpenTelemetry Collector filter processor documentation: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/processor/filterprocessor
- OpenTelemetry Collector transform processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/transformprocessor/README.md
- OpenTelemetry Collector OTTL functions documentation: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/pkg/ottl/ottlfuncs
- OpenTelemetry Collector span metrics connector documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/connector/spanmetricsconnector/README.md
- OneUptime related post links referenced in the article: https://oneuptime.com/blog/post/2026-02-06-cut-observability-costs-opentelemetry-filtering-sampling/view, https://oneuptime.com/blog/post/2026-02-06-handle-high-cardinality-metrics-opentelemetry/view, https://oneuptime.com/blog/post/2026-02-06-probabilistic-sampling-opentelemetry-cost-control/view

## Issues Found
- The Python SDK examples claimed a `SpanProcessor` could suppress export by setting a `span.suppressed` attribute. That does not stop later processors from exporting the span. Replaced these examples with `SpanExporter` wrappers that filter spans before delegating to the OTLP exporter.
- The Go example imported the trace SDK twice and omitted the OTLP gRPC exporter import. Fixed the imports so the example can compile.
- Collector filter examples used deprecated `traces.span` style and non-current OTTL paths such as `attributes`, `name`, raw duration pseudo-fields, and `matches`. Updated them to current `trace_conditions` syntax with `span.attributes`, `span.name`, `span.kind`, `span.status.code`, `Duration(...)`, and `IsMatch(...)`.
- Transform processor snippets used unsupported or misapplied functions such as `Truncate`, `Hash`, and `ReplaceAllPatterns` on a string. Replaced them with documented OTTL functions including `Substring`, `Len`, `XXH3`, and `replace_pattern`.
- The Java child-span suppressor tried to read parent names and attributes from the API `Span`, used the parent span ID as a name, and did not forward accepted spans to an exporter or downstream processor. Rewrote it as a wrapping `SpanProcessor` that tracks active span metadata and only forwards non-suppressed ended spans.
- The service-tier Collector example configured a routing processor that was not used by the pipelines and referenced an undefined default exporter. Replaced it with tier-specific filter conditions that drop spans from other tiers.
- The monitoring example used the deprecated spanmetrics processor pattern with `metrics_exporter`. Updated it to the current `span_metrics` connector pattern with before/after trace pipelines and a metrics pipeline.
- Several Collector snippets referenced receivers, exporters, or processors that were not defined in the same snippet. Added the missing `otlp`, `batch`, and exporter definitions where needed.

## Review Notes
No local `otelcol` or `otelcol-contrib` binary was installed, so Collector YAML was reviewed statically against official documentation rather than executed with a Collector binary.
