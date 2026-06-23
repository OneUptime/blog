# Validation Summary: How to collect internal metrics from OpenTelemetry Collector?

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- OpenTelemetry Collector (internal telemetry / `service.telemetry.metrics`)
- OpenTelemetry Protocol (OTLP), HTTP/protobuf transport
- OpenTelemetry Configuration (SDK) schema
- OneUptime (as the OTLP backend example)

## Sources Consulted
- OpenTelemetry Collector internal telemetry docs: https://opentelemetry.io/docs/collector/internal-telemetry/
- OpenTelemetry Configuration schema — `common.yaml` (`headers` / `NameStringValuePair` / `OtlpHttpExporter` definitions): https://github.com/open-telemetry/opentelemetry-configuration/blob/main/schema/common.yaml
- OpenTelemetry Configuration example configs (`otel-sdk-config.yaml`, `otel-sdk-migration-config.yaml`): https://github.com/open-telemetry/opentelemetry-configuration/tree/main/examples
- OTLP Exporter specification: https://opentelemetry.io/docs/specs/otel/protocol/exporter/

## Issues Found
- **Incorrect `headers` format in the `service.telemetry.metrics` reader config.** The post used a map-style header:
  ```yaml
  headers:
   x-oneuptime-token: YOUR_ONEUPTIME_TOKEN
  ```
  The `service.telemetry` block does **not** use the Collector's pipeline `exporters:` syntax (where headers are a `key: value` map). It uses the OpenTelemetry Configuration (SDK) schema, where the OTLP exporter's `headers` field is defined as an **array of `NameStringValuePair` objects** (each with required `name` and `value` keys). The original map form would fail schema validation. Fixed to:
  ```yaml
  headers:
    - name: x-oneuptime-token
      value: YOUR_ONEUPTIME_TOKEN
  ```
  Also added a short clarifying comment noting that headers here is a list of name/value pairs.

## Review Notes
- The remaining structure is correct for the OpenTelemetry Configuration schema used by `service.telemetry`: `readers` → `periodic` → `exporter` → `otlp` with `protocol: http/protobuf` and `endpoint`. This matches the official internal-telemetry documentation example.
- The YAML in the post uses slightly inconsistent indentation (`metrics:` is indented further than its sibling style elsewhere). It is still valid YAML and parses correctly, so it was left as-is to avoid stylistic restructuring.
- The OneUptime-specific details (`https://oneuptime.com/otlp` endpoint and the `x-oneuptime-token` auth header) are consistent with OneUptime's documented OTLP ingestion setup.
- Note for future maintenance: the OpenTelemetry Configuration schema is evolving (file_format 1.x examples now use `otlp_http:` instead of `otlp:` + `protocol:`). The Collector currently still accepts the `otlp:`/`protocol:` form shown here, but this may need revisiting as the Collector adopts newer schema versions.
