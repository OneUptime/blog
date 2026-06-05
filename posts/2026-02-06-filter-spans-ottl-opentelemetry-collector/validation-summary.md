# Validation Summary: How to Filter Spans Using OTTL in the OpenTelemetry Collector

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector filter processor
- OpenTelemetry Transformation Language (OTTL)
- OpenTelemetry span data model and span context paths
- OpenTelemetry Collector debug exporter and internal telemetry
- OpenTelemetry semantic conventions for HTTP attributes

## Sources Consulted
- OpenTelemetry Collector Contrib filter processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/filterprocessor/README.md
- OpenTelemetry Collector Contrib OTTL span context README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/ottl/contexts/ottlspan/README.md
- OpenTelemetry Collector Contrib OTTL functions README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/ottl/ottlfuncs/README.md
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/
- OpenTelemetry Collector troubleshooting documentation for the debug exporter: https://opentelemetry.io/docs/collector/troubleshooting/
- OpenTelemetry semantic conventions for HTTP spans: https://opentelemetry.io/docs/specs/semconv/http/http-spans/

## Issues Found
- The post used the older `spans.include` / `spans.exclude` configuration style with `match_type: expr` and `match_type: strict`. Updated examples to the current documented `trace_conditions` filter processor configuration.
- Several OTTL examples used unqualified span paths such as `name`, `attributes`, `status.code`, `start_time`, and `end_time`. Updated them to current span-context paths such as `span.name`, `span.attributes`, `span.status.code`, `span.start_time`, and `span.end_time`.
- Regex examples used a non-OTTL `matches` operator. Replaced these with the documented OTTL `IsMatch(...)` converter function.
- Duration comparisons used raw nanosecond integers. Replaced these with `Duration(...)` comparisons, matching current filter processor documentation examples.
- Root/child span examples compared `parent_span_id` to an empty string. Updated them to compare `span.parent_span_id` with an empty `SpanID(...)`, as required by the span context documentation.
- Examples referred to span kind as `attributes["span.kind"]`. Updated these to use the actual `span.kind` field and `SPAN_KIND_INTERNAL` enum.
- Several examples used include-style "keep" logic, but the current filter processor drops telemetry when a condition is true. Rewrote those examples as equivalent drop conditions or separate high-priority / low-priority filters.
- HTTP examples used older semantic convention attribute names such as `http.status_code`, `http.target`, `http.method`, and `http.user_agent`. Updated them to current names including `http.response.status_code`, `url.path`, `http.request.method`, and `user_agent.original`.
- The monitoring snippet configured `service.telemetry.metrics.address`, which is ignored as of Collector v0.123.0. Removed the ignored setting while retaining `metrics.level: detailed`.
- The monitoring checklist referred to dropped span counts "by reason", which is not a generic filter processor metric. Reworded it to monitor processor accepted/refused span counts.
- The testing snippet incorrectly configured `debug` as a processor and included it in the processors list. Corrected it to configure `debug` only as an exporter and keep the pipeline processors list to `[filter]`.

## Review Notes
The current filter processor documentation applies to Collector Contrib v0.146.0 and later. Older `spans.include` / `spans.exclude` configurations may still be accepted for backward compatibility, but they are no longer the documented current style.
