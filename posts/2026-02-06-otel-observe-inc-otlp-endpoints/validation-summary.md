# Validation Summary: How to Send OpenTelemetry Data to Observe Inc via the Observe Agent OTLP gRPC

## Status
validated

## Post Type
Tutorial / Integration guide

## Technologies Covered
- OpenTelemetry
- OTLP HTTP/protobuf
- Observe Inc data ingestion
- Go OpenTelemetry SDK and OTLP exporters
- Python OpenTelemetry SDK and OTLP exporters

## Sources Consulted
- Observe Endpoints documentation: https://docs.observeinc.com/docs/endpoints
- Observe OpenTelemetry endpoint documentation: https://docs.observeinc.com/en/o4snewdocs/content/data-ingestion/endpoints/otel.html
- Observe OpenTelemetry Collector documentation: https://docs.observeinc.com/en/o4snewdocs/content/send-data/otel-collector.html
- OpenTelemetry Protocol Exporter specification: https://opentelemetry.io/docs/specs/otel/protocol/exporter/
- OpenTelemetry Python OTLP exporter API documentation: https://opentelemetry-python.readthedocs.io/en/stable/exporter/otlp/otlp.html
- OpenTelemetry Go OTLP trace HTTP exporter documentation: https://pkg.go.dev/go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracehttp
- OpenTelemetry Go OTLP metric HTTP exporter documentation: https://pkg.go.dev/go.opentelemetry.io/otel/exporters/otlp/otlpmetric/otlpmetrichttp

## Issues Found
- The post listed `collect.observeinc.com:4317` as an Observe cloud OTLP gRPC endpoint. Observe's public ingestion documentation describes customer-specific collection hostnames and OTLP HTTP/protobuf for direct OpenTelemetry ingestion, so the post was updated to use `https://<customer-id>.collect.observeinc.com/v2/otel`.
- The post described the bearer token as `customerID:datastreamToken`. Observe bearer authentication uses the datastream token as the bearer token, while the customer ID belongs in the hostname. The code and environment variable examples now use `Authorization: Bearer <datastream-token>`.
- The Go and Python examples used OTLP gRPC exporters against an unsupported direct cloud endpoint. They now use OTLP HTTP exporters and signal-specific paths: `/v2/otel/v1/traces` and `/v2/otel/v1/metrics`.
- The environment variable example used an HTTPS URL with port `4317`, which mixes OTLP/gRPC's default port with an HTTPS URL. It now sets the Observe OTLP HTTP base endpoint and explicitly sets `OTEL_EXPORTER_OTLP_PROTOCOL="http/protobuf"`.

## Review Notes
The post remains a direct Observe OTLP HTTP ingestion guide. If the article is later changed back to focus on the Observe Agent's local OTLP/gRPC receiver, the examples should target the agent endpoint instead of Observe's cloud collection endpoint and should not include Observe cloud ingestion bearer headers in the application exporter configuration.
