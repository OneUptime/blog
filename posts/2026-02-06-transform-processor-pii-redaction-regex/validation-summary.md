# Validation Summary: How to Use the Transform Processor for Fine-Grained PII Redaction with Regex

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector Contrib distribution
- Transform processor
- OpenTelemetry Transformation Language (OTTL)
- Regex-based PII redaction
- Debug exporter

## Sources Consulted
- OpenTelemetry Collector transform processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/transformprocessor/README.md
- OTTL function documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/ottl/ottlfuncs/README.md
- OpenTelemetry Collector processor component list: https://opentelemetry.io/docs/collector/components/processor/
- OpenTelemetry Collector attributes processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/attributesprocessor/README.md
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/
- OpenTelemetry Collector troubleshooting documentation for the debug exporter: https://opentelemetry.io/docs/collector/troubleshooting/
- OpenTelemetry Collector logging exporter removal notice: https://github.com/open-telemetry/opentelemetry-collector/issues/11337

## Issues Found
- The comparison with the `attributes` processor said it can only delete or overwrite entire attribute values. Updated this to say it works at the attribute key/value level, because the attributes processor also supports actions such as insert, upsert, hash, extract, and convert.
- The OTTL function overview incorrectly grouped `replace_match` and `replace_all_matches` with regex functions. Updated the text to distinguish regex functions (`replace_pattern`, `replace_all_patterns`) from wildcard-style match functions (`replace_match`, `replace_all_matches`).
- The phone-number example listed formats like `5551234567` and `+1-555-123-4567`, but the config did not redact those forms. Added patterns for contiguous 10-digit US numbers and optional-dash `+1` numbers in both span attributes and log bodies.
- The dynamic attribute key section implied listing known keys was the main Collector workaround and mentioned span events. Updated it to mention `replace_all_patterns(attributes, "value", ...)`, which can scan string values across an attribute map.
- The testing section told readers to use the removed/deprecated `logging` exporter while the snippet used `debug`. Updated the prose to use the current `debug` exporter.
- The performance section named `otelcol_processor_transform_duration`, which is not listed in current Collector internal metrics. Replaced it with current Collector throughput and resource metrics.

## Review Notes
Validated representative transform processor snippets with `otel/opentelemetry-collector-contrib:0.153.0 validate` by wrapping the post's partial processor snippets in minimal Collector pipelines. The regex examples are intentionally broad tutorial examples; production PII detection should still be tuned and tested against real data to reduce false positives and missed variants.
