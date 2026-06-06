# Validation Summary: How to Configure the Redaction Processor to Block Sensitive Attributes

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector Contrib redaction processor
- OpenTelemetry Collector Builder (ocb)
- YAML Collector configuration
- Collector internal telemetry

## Sources Consulted
- OpenTelemetry Collector Contrib redaction processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/redactionprocessor/README.md
- OpenTelemetry Collector Contrib redaction processor config schema: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/redactionprocessor/config.schema.yaml
- OpenTelemetry Collector Contrib redaction processor implementation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/redactionprocessor/processor.go
- OpenTelemetry Collector Contrib redaction processor metadata: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/redactionprocessor/metadata.yaml
- OpenTelemetry Collector distributions documentation: https://opentelemetry.io/docs/collector/distributions/
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/

## Issues Found
- `allowed_keys` was described and used as supporting regex patterns. The upstream implementation builds `allowed_keys` as an exact-key map; regex key matching is available for fields such as `ignored_key_patterns` and `blocked_key_patterns`. I changed the explanation and replaced regex allowlist examples with explicit attribute keys.
- The post said resource attributes are not processed. Current redaction processor code processes resource attributes, scope attributes, span attributes, span event attributes, log record attributes, log body maps, and metric datapoint attributes. I updated the processing notes accordingly.
- The post implied `blocked_values` checks all attribute value types by default. Current config defaults to string values only, with `redact_all_types: true` for checking non-string values via string conversion. I added that caveat.
- The `summary: debug` output example omitted `redaction.allowed.*` attributes. I updated the example and adjusted the surrounding wording.
- The production configuration used `service.telemetry.metrics.address`, which is ignored as of Collector v0.123.0. I replaced it with the current `readers -> pull -> prometheus` configuration.
- The performance section referenced `otelcol_processor_latency`, which is not listed in current Collector internal telemetry docs. I replaced it with the documented processor item counters plus end-to-end latency measurement.
- The custom Collector Builder snippet pinned `redactionprocessor` to old `v0.96.0`. I updated it to `v0.153.0`, matching the current Collector release referenced by OpenTelemetry docs on June 6, 2026.
- The "Span Events and Links" heading implied span link processing, but the implementation path reviewed processes span events, not span link attributes. I renamed the heading to "Span Events."
- The production allowlist included span status and kind field names as if they were attributes. I removed `span.kind`, `status.code`, and `status.message` from the `allowed_keys` example.

## Review Notes
- The redaction processor is listed in the upstream metadata as available in the contrib and k8s distributions, with beta stability for traces and alpha stability for logs and metrics.
- Some examples still include older semantic convention keys such as `http.method` because they are common in existing telemetry. Future revisions could distinguish legacy and current semantic convention attribute names more explicitly.
