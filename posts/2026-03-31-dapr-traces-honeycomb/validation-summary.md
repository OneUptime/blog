# Validation Summary: How to Send Dapr Traces to Honeycomb

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (sidecar tracing configuration, Kubernetes annotations)
- Honeycomb (OTLP ingestion, query builder, Events API)
- OpenTelemetry (Collector configuration, OTLP export, Python tracing SDK)
- Kubernetes (ConfigMaps, Secrets, Pod annotations)

## Sources Consulted
- Dapr Configuration spec reference: https://docs.dapr.io/reference/resource-specs/configuration-schema/
- Dapr Kubernetes annotations reference: https://docs.dapr.io/reference/arguments-annotations-overview/
- Dapr observability tracing documentation: https://docs.dapr.io/operations/observability/tracing/
- Honeycomb OpenTelemetry documentation: https://docs.honeycomb.io/send-data/opentelemetry/
- Honeycomb API authentication: https://docs.honeycomb.io/api/auth/
- OpenTelemetry Collector OTLP exporter documentation: https://github.com/open-telemetry/opentelemetry-collector/tree/main/exporter/otlpexporter
- OpenTelemetry Python SDK documentation: https://opentelemetry.io/docs/languages/python/
- OpenTelemetry environment variable specification: https://opentelemetry.io/docs/specs/otel/configuration/sdk-environment-variables/
- Cross-referenced with validated Dapr tracing posts for Lightstep and Splunk Observability in this blog

## Issues Found

1. **Incorrect Dapr annotation name `dapr.io/sidecar-env-vars`**: This annotation does not exist in Dapr's official documentation. The correct annotation for setting environment variables on the Dapr sidecar is `dapr.io/env`. Changed `dapr.io/sidecar-env-vars` to `dapr.io/env`.

2. **Comma-delimited value caused parsing ambiguity in `dapr.io/env` annotation**: The original value `OTEL_EXPORTER_OTLP_HEADERS=x-honeycomb-team=YOUR_API_KEY,x-honeycomb-dataset=dapr-traces` contains a comma. Dapr's `dapr.io/env` annotation parser splits on commas to separate multiple environment variables, so this would be misinterpreted as two env vars: `OTEL_EXPORTER_OTLP_HEADERS=x-honeycomb-team=YOUR_API_KEY` and `x-honeycomb-dataset=dapr-traces` (the latter being an invalid standalone env var). Removed `x-honeycomb-dataset` from the annotation value. In modern Honeycomb (Environments & Services mode), the dataset is determined by the `service.name` OpenTelemetry resource attribute, so the `x-honeycomb-dataset` header is not required.

3. **Invalid OTLP verification curl command**: The original command sent an empty JSON body `'{}'` to `https://api.honeycomb.io/v1/traces` (the OTLP/HTTP endpoint). An empty object is not a valid `ExportTraceServiceRequest` payload and would return a 400 error, not the stated 200 or 204. Replaced with a call to Honeycomb's auth verification endpoint (`/1/auth`) which is the standard way to verify API key validity and connectivity.

## Review Notes
- The Dapr Configuration CRD in Option 1 correctly uses `spec.tracing.otel` fields (`endpointAddress`, `isSecure`, `protocol`), which are current as of Dapr 1.13+.
- The OpenTelemetry Collector configuration in Option 2 is correct. The OTLP gRPC exporter defaults to TLS enabled (`tls.insecure: false`), so specifying `api.honeycomb.io:443` works without explicit TLS configuration.
- The `x-honeycomb-dataset` header remains correctly used in the OpenTelemetry Collector config (Option 2), where it is a proper YAML map entry with no parsing ambiguity. Users on Honeycomb Classic will need this header; users on Environments & Services mode can omit it.
- The Python OpenTelemetry code for enriching spans is syntactically correct and uses current API (`trace.get_tracer`, `start_as_current_span`, `set_attribute`).
- The Honeycomb query syntax shown is a conceptual representation of the visual query builder, not literal SQL. This is acceptable for illustration.
- Whether the Dapr sidecar's internal OTLP exporter respects the `OTEL_EXPORTER_OTLP_HEADERS` environment variable depends on Dapr's use of the Go OTEL SDK internally. This approach is plausible but may not be officially documented by Dapr. Option 2 (via Collector) is the more reliable and well-documented approach for header-based authentication.
