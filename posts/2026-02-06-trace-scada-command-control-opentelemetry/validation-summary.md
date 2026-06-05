# Validation Summary: How to Trace SCADA System Command and Control Flows with OpenTelemetry While

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry tracing
- OpenTelemetry Python SDK
- OTLP/HTTP
- SCADA systems
- RTUs and PLCs
- Modbus and DNP3
- Data diodes / unidirectional gateways

## Sources Consulted
- OpenTelemetry Python SDK trace export documentation: https://opentelemetry-python.readthedocs.io/en/latest/sdk/trace.export.html
- OpenTelemetry Python exporters documentation: https://opentelemetry.io/docs/languages/python/exporters/
- OpenTelemetry tracing API specification: https://opentelemetry.io/docs/specs/otel/trace/api/
- OpenTelemetry Protocol specification: https://opentelemetry.io/docs/specs/otlp/
- OpenTelemetry OTLP exporter configuration documentation: https://opentelemetry.io/docs/concepts/sdk-configuration/otlp-exporter-configuration/
- NIST SP 800-82 Rev. 3, Guide to Operational Technology (OT) Security: https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-82r3.pdf

## Issues Found
- The custom exporter used `span.context` directly. The current SDK still exposes this, but the documented API for retrieving a span context is `get_span_context()`. Updated the example to use `span.get_span_context()` before formatting trace and span IDs.
- The security note said standard OpenTelemetry context propagation is bidirectional. Context propagation follows application message flow and is not inherently a reverse channel. Updated the wording to clarify that context can be propagated in any direction messages travel, and that the IT side must not inject trace context back into the OT network.

## Review Notes
The IT-side `convert_to_otlp(span_data)` function is intentionally left as a placeholder. Any implementation should emit valid OTLP JSON Protobuf encoding, including lowerCamelCase field names, hex-encoded trace and span IDs, and integer enum values as required by the OTLP specification. The local environment did not include Python `venv`, so runtime validation used an isolated `pip --target` install of `opentelemetry-sdk`; all Python code blocks were also checked for syntax.
