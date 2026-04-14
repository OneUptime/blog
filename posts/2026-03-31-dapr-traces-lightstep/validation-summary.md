# Validation Summary: How to Send Dapr Traces to Lightstep

## Status
validated

## Post Type
Tutorial / Integration Guide

## Technologies Covered
- Dapr (distributed application runtime)
- Lightstep / ServiceNow Cloud Observability
- OpenTelemetry Collector
- OpenTelemetry Protocol (OTLP)
- Kubernetes (annotations, ConfigMaps, Secrets)

## Sources Consulted
- Dapr Configuration spec reference: https://docs.dapr.io/reference/resource-specs/configuration-schema/
- Dapr tracing setup guide: https://docs.dapr.io/operations/observability/tracing/setup-tracing/
- Dapr Kubernetes annotations reference: https://docs.dapr.io/reference/arguments-annotations-overview/
- OpenTelemetry Collector exporter helpers (retry_on_failure): https://github.com/open-telemetry/opentelemetry-collector/tree/main/exporter/exporterhelper
- Dapr issue #3876 (comma parsing in env annotation): https://github.com/dapr/dapr/issues/3876

## Issues Found

1. **`retry_on_failure` incorrectly listed as a standalone processor**: In the OpenTelemetry Collector configuration, `retry_on_failure` was defined under the `processors:` section and referenced in the pipeline's `processors` list. `retry_on_failure` is actually an exporter helper configuration that must be nested under the exporter block, not a standalone processor. Listing it as a processor would cause the Collector to fail at startup. Moved `retry_on_failure` under the `otlp/lightstep` exporter and removed it from the pipeline's processor list.

2. **`lightstep-access-token` incorrectly placed in `OTEL_RESOURCE_ATTRIBUTES`**: In the Service Diagram section, `lightstep-access-token=YOUR_TOKEN` was appended to the end of the `OTEL_RESOURCE_ATTRIBUTES` value. This is an authentication header that belongs in `OTEL_EXPORTER_OTLP_HEADERS`, not a resource attribute. Additionally, the comma-delimited format caused the multi-value `OTEL_RESOURCE_ATTRIBUTES` string to be misinterpreted by Dapr's annotation parser (which splits on commas to separate env vars). Fixed by setting `OTEL_RESOURCE_ATTRIBUTES=service.name=payment-service` (single attribute to avoid comma ambiguity) and `OTEL_EXPORTER_OTLP_HEADERS=lightstep-access-token=YOUR_TOKEN` as separate env vars.

3. **Incorrect Dapr annotation name `dapr.io/sidecar-env-vars`**: This annotation does not exist in Dapr's official documentation. The correct annotation for setting environment variables on the Dapr sidecar is `dapr.io/env`. Changed both occurrences in the post.

## Review Notes
- Dapr's `dapr.io/env` annotation splits values on commas, which means `OTEL_RESOURCE_ATTRIBUTES` values containing multiple key-value pairs (e.g., `service.name=foo,service.version=1.0`) will be misinterpreted. This is a known Dapr limitation (dapr/dapr#3876). The Service Diagram example was simplified to use a single resource attribute to avoid this issue. Users needing multiple resource attributes should set them via pod-level environment variables in their Deployment spec instead.
- Lightstep has been rebranded to ServiceNow Cloud Observability. The post correctly notes this, but the `ingest.lightstep.com` endpoint and `lightstep-access-token` header name remain valid as of the review date.
- The Dapr Configuration resource (`apiVersion: dapr.io/v1alpha1`, `spec.tracing.otel` with `endpointAddress`, `isSecure`, `protocol`) is correct per current Dapr documentation.
