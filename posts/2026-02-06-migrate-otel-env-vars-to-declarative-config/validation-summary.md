# Validation Summary: How to Migrate from OpenTelemetry OTEL_* Env Variables to Declarative Config

## Status
validated

## Post Type
Tutorial / Migration guide

## Technologies Covered
- OpenTelemetry SDK declarative configuration
- OpenTelemetry SDK environment variables
- OTLP exporters
- Kubernetes deployment environment variables
- Bash
- jq
- Python
- YAML

## Sources Consulted
- OpenTelemetry Declarative Configuration: https://opentelemetry.io/docs/languages/sdk-configuration/declarative-configuration/
- OpenTelemetry Environment Variable Specification: https://opentelemetry.io/docs/specs/otel/configuration/sdk-environment-variables/
- OpenTelemetry Protocol Exporter Specification: https://opentelemetry.io/docs/specs/otel/protocol/exporter/
- OpenTelemetry Common Configuration Specification: https://opentelemetry.io/docs/specs/otel/configuration/common/
- OpenTelemetry Declarative Configuration schema docs: https://github.com/open-telemetry/opentelemetry-configuration/blob/main/schema-docs.md

## Issues Found
- The post used `file_format: "0.3"`, but the current stable declarative configuration examples and schema use `file_format: "1.0"`. Updated the Python generator.
- The post used `OTEL_EXPERIMENTAL_CONFIG_FILE`, which is now deprecated in favor of `OTEL_CONFIG_FILE`. Updated the Kubernetes snippets.
- The mapping table and Python generator used `exporter.otlp` plus a `protocol` field. The declarative schema uses exporter keys such as `otlp_grpc` and `otlp_http`; HTTP JSON uses `otlp_http.encoding`. Updated the table and generator.
- The mapping table described `resource.attributes` as a key-value map. The declarative schema represents explicit resource attributes as a list of `name`/`value` entries, with `attributes_list` available for comma-separated environment-style resource attributes. Updated the table and generator.
- The mapping table and generator represented propagators as a list of strings under `propagator.composite`. The current config supports `propagator.composite_list` for the comma-separated environment-style value or `composite` entries. Updated the table and generator.
- `OTEL_ATTRIBUTE_COUNT_LIMIT` was mapped to `tracer_provider.limits.attribute_count_limit`, but the schema has general attribute limits at `attribute_limits.attribute_count_limit`. Updated the table.
- The converter defaulted to the older gRPC-oriented assumptions. Updated the protocol default to `http/protobuf`, with the endpoint default depending on the selected protocol, and added explicit `OTEL_EXPORTER_OTLP_PROTOCOL=grpc` to examples that use port 4317.
- The converter reused a generic OTLP endpoint for HTTP. For OTLP/HTTP declarative config, the per-signal endpoints should include `/v1/traces`, `/v1/metrics`, and `/v1/logs`. Updated the generator.

## Review Notes
Declarative configuration support is still implementation-dependent even though the schema is stable. The OpenTelemetry docs currently list Java support and note that implementation support remains experimental.
