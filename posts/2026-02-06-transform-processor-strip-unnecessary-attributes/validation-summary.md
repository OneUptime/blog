# Validation Summary: How to Use the OpenTelemetry Transform Processor to Strip Unnecessary

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry Collector
- Transform processor
- OpenTelemetry Transformation Language (OTTL)
- OTLP receiver and exporter configuration
- Collector internal telemetry metrics
- PromQL-style querying

## Sources Consulted
- OpenTelemetry Collector Contrib transform processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/transformprocessor/README.md
- OpenTelemetry Transformation Language README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/ottl/README.md
- OTTL function reference: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/ottl/ottlfuncs/README.md
- OTTL span context paths and enums: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/ottl/contexts/ottlspan/README.md
- OTTL log context paths and enums: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/ottl/contexts/ottllog/README.md
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/

## Issues Found
- The transform processor examples used the older `context: span` / `context: log` grouping and unprefixed paths such as `attributes`, `status.code`, and `severity_number`. The current transform processor documentation for v0.120.0 and later documents direct OTTL statements with path prefixes such as `span.attributes`, `span.status.code`, and `log.severity_number`. Updated all examples to the current documented syntax.
- The OTTL context explanation listed only `span`, `metric`, `log`, `resource`, and `scope`. Updated it to include current path contexts used by the docs, including `datapoint` and `instrumentation_scope`.
- The truncation example said it truncated `log body` to 4096 characters, but the code called `truncate_all(attributes, 256)`. The `truncate_all` function operates on `pcommon.Map` values, such as `log.attributes`, and its limit is bytes. Updated the wording and snippet to describe truncating log attribute string values to 256 bytes.
- The conditional deletion example used numeric span status code comparison with `status.code == 0`. Updated it to the current prefixed path and documented enum, `span.status.code != STATUS_CODE_ERROR`, which matches the intent of keeping data on error spans.
- The log severity example used numeric comparison `severity_number < 17`. Updated it to `log.severity_number < SEVERITY_NUMBER_ERROR`, using the documented log severity enum.
- The resource cleanup example only configured `trace_statements`, even though the surrounding text explains that resource attributes are attached to every telemetry item. Added matching `log_statements` and included the resource processor in the logs pipeline in the combined example.
- The PromQL example used a backend-specific metric name, `span_attribute_keys_total`, without making clear that it is not a standard OpenTelemetry Collector metric. Clarified that it is a PromQL-style example and that readers should replace the metric name with one exposed by their backend.
- The URL cleanup example only referenced the legacy `http.url` attribute. Added `url.full` while keeping `http.url` for older instrumentation.

## Review Notes
Validated the combined Collector configuration syntax with `otel/opentelemetry-collector-contrib:latest validate --config=/etc/otelcol/config.yaml` after translating the exporter to `debug` for local validation. The official docs note that pre-v0.120 transform processor configuration remains supported, but the post now uses the current documented style.
