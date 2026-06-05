# Validation Summary: How to Set Up Role-Based Access Control for Telemetry Data Using

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector routing connector
- OpenTelemetry Collector attributes processor
- OpenTelemetry Collector transform processor and OTTL
- OTLP HTTP exporter
- YAML configuration
- Python and PyYAML

## Sources Consulted
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/
- OpenTelemetry Collector routing connector README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/connector/routingconnector/README.md
- OpenTelemetry Collector attributes processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/attributesprocessor/README.md
- OpenTelemetry Collector transform processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/transformprocessor/README.md
- OpenTelemetry OTTL functions README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/ottl/ottlfuncs/README.md

## Issues Found
- The gateway configuration used `routing` as a processor with `from_attribute` and `attribute_source`. Current OpenTelemetry Collector documentation describes routing as a connector configured under `connectors`, using OTTL `context` and `condition` table entries. Changed the example to use `routing/traces`, `routing/metrics`, and `routing/logs` connectors.
- The intake pipeline had `exporters: []` and used `routing` in the processors list. Routing connectors must be enabled as exporters in the source pipelines and receivers in destination pipelines. Changed the intake pipelines to `traces/in`, `metrics/in`, and `logs/in`, each exporting to the appropriate routing connector.
- The original routing table mixed trace, metric, and log destination pipelines in the same entries. Since Collector pipelines are signal-specific, changed the example to use separate signal-specific routing connectors and destination pipeline names.
- The transform processor example used older or invalid OTTL paths such as `attributes["user.id"]` in trace statements and attempted `SHA256(...)` as the replacement argument to `replace_pattern`. Updated the transform statements to use `span.attributes`, `datapoint.attributes`, and `log.attributes`, and used `set(..., SHA256(...))` for hashing.
- The replacement string used `$1` in YAML, which can be interpreted by Collector environment-variable expansion. Changed it to `$$1`, matching Collector guidance for literal dollar signs in OTTL replacement strings.
- The shared logs pipeline referenced a transform processor that only defined trace statements. Added log statements. Added metric statements as well so the shared metrics pipeline performs the same anonymization pattern.
- The team-specific metrics pipelines did not apply the same attribute stripping described by the text. Added the relevant attributes processors to `metrics/payments` and `metrics/platform`.
- The audit logging section claimed the shown configuration would track all attribute filtering operations. Stock Collector processors do not emit per-attribute audit records for every filtering decision. Updated the text to describe Collector internal logs as troubleshooting logs and noted that compliance-grade audit events require backend audit logs or a custom processor.
- Removed the `file_storage` extension from the audit logging snippet because it provides persistent component storage and does not itself audit filtering operations.

## Review Notes
- Validated the updated Collector configuration with `otel/opentelemetry-collector-contrib:latest validate --config=/etc/otelcol-contrib/config.yaml`.
- Verified the Python generator snippet with `python3 -m py_compile`.
- The attributes processor `hash` action is valid, but it uses SHA1 per the upstream attributes processor documentation. The shared transform example uses OTTL `SHA256`.
