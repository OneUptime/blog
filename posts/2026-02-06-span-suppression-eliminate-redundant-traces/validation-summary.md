# Validation Summary: How to Implement Span Suppression Strategies to Eliminate Redundant Trace Data

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry Java SDK
- OpenTelemetry Python auto-instrumentation
- OpenTelemetry Collector
- Collector filter processor
- Collector transform processor
- OpenTelemetry Transformation Language (OTTL)
- Prometheus metrics and PromQL

## Sources Consulted
- OpenTelemetry Trace SDK specification: https://opentelemetry.io/docs/specs/otel/trace/sdk/
- OpenTelemetry Java SDK exporter documentation: https://opentelemetry.io/docs/languages/java/exporters/
- OpenTelemetry Java SpanData Javadoc: https://javadoc.io/static/io.opentelemetry/opentelemetry-sdk-trace/
- OpenTelemetry Python agent configuration: https://opentelemetry.io/docs/zero-code/python/configuration/
- OpenTelemetry Collector filter processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/filterprocessor/README.md
- OpenTelemetry Collector transform processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/transformprocessor/README.md
- OpenTelemetry Collector OTTL span context documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/ottl/contexts/ottlspan/README.md
- OpenTelemetry Collector OTTL functions documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/ottl/ottlfuncs/README.md
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/

## Issues Found
- The Java example described a `SpanProcessor` as filtering spans before export, but the code only set an attribute and did not actually prevent export. I added an exporter wrapper that drops marked spans and short non-error spans before delegating to the real exporter.
- The Java example was missing required imports and had an unused duration threshold. I added the imports, used the threshold in the exporter wrapper, and preserved error spans.
- The Python environment-variable example did not state that disabled instrumentations must be configured before auto-instrumentation starts. I clarified the setup timing.
- The Collector filter examples used older `traces.span` configuration and unprefixed OTTL paths such as `name`, `duration`, `kind`, and `status.code`. I updated them to the current `trace_conditions` format with `span.*` paths and `Duration(...)` expressions.
- The nested-span example used `parent_span_id != nil`, but current OTTL span IDs should not be checked with `nil`. I changed the rule to use `not IsRootSpan()`.
- The transform processor example used older grouped context syntax and unprefixed `attributes`. I updated it to current `trace_statements` with `span.attributes`.
- The text incorrectly referred to tail-based sampling as suppressing redundant spans in the shown processor block. I changed it to describe the transform processor removing large attributes.
- The filter processor metrics used older underscore-style names. I updated them to the current internal telemetry names `otelcol_processor_filter_logs.filtered` and `otelcol_processor_filter_spans.filtered`.
- The guideline to never suppress root spans conflicted with intentional health-check trace suppression. I clarified that root-span suppression should be avoided unless the goal is to drop an entire low-value trace.

## Review Notes
The quoted 40-60% and 15-20% reduction figures are plausible operational estimates but are workload-dependent rather than guarantees from OpenTelemetry documentation. The Collector filter processor trace signal is still documented as alpha, so production users should test rules carefully and pin Collector versions where configuration stability matters.
