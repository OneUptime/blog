# Validation Summary: How to Build a Data Masking Pipeline That Redacts PII from Traces, Metrics,

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector attributes processor
- OpenTelemetry Collector redaction processor
- OpenTelemetry Collector transform processor
- OpenTelemetry Transformation Language (OTTL)
- OpenTelemetry Collector internal telemetry
- Collector YAML configuration
- Regular expressions for PII masking

## Sources Consulted
- OpenTelemetry Collector processor component list: https://opentelemetry.io/docs/collector/components/processor/
- OpenTelemetry Collector attributes processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/attributesprocessor/README.md
- OpenTelemetry Collector redaction processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/redactionprocessor/README.md
- OpenTelemetry Collector transform processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/transformprocessor/README.md
- OpenTelemetry OTTL functions README, including `replace_pattern`, `set`, and `SHA256`: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/ottl/ottlfuncs/README.md
- OpenTelemetry OTTL log context README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/ottl/contexts/ottllog/README.md
- OpenTelemetry OTTL datapoint context README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/ottl/contexts/ottldatapoint/README.md
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/

## Issues Found
- The transform processor examples used older unqualified OTTL paths such as `body` and `attributes[...]`. Updated them to current context-qualified paths such as `log.body` and `datapoint.attributes[...]`.
- The redaction processor examples claimed broad value scanning, including credit-card values, but did not enable `redact_all_types`. Added `redact_all_types: true` so non-string attribute values can be checked through their string representation.
- The post stated that the redaction processor does not touch log bodies. Current redaction documentation focuses on span, log, and metric datapoint attributes and also documents map log body audit behavior, so I narrowed the claim to string log bodies and kept OTTL as the recommended approach for those.
- The complete metrics pipeline omitted the redaction processor even though the post describes a unified redaction pipeline across traces, metrics, and logs. Added `redaction/pii-values` to the metrics pipeline.
- The complete metrics transform double-hashed `user.id` after the attributes processor had already hashed it. Changed the transform example in the complete configuration to hash `customer.email`, leaving `user.id` to the attributes processor.
- The internal telemetry snippet used the older `service.telemetry.metrics.address` setting, which current Collector documentation says is ignored as of Collector v0.123.0. Replaced it with the current Prometheus pull reader configuration.
- The post referenced a non-existent built-in metric, `otelcol_processor_redaction_blocked_values_total`. Replaced that claim with the redaction processor's documented audit attributes, such as `redaction.masked.count` and `redaction.redacted.count`, and noted that custom/backend-derived metrics can be built from them.

## Review Notes
Validated the corrected complete Collector configuration with `otel/opentelemetry-collector-contrib:latest` using `otelcol-contrib validate`. Also validated the updated internal telemetry reader syntax in a minimal Collector configuration. The redaction processor is beta for traces and alpha for logs and metrics in current upstream component metadata, so production users should verify the stability expectations for their Collector distribution and version.
