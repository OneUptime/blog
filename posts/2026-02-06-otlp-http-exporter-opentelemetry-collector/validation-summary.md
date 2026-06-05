# Validation Summary: How to Configure the OTLP HTTP Exporter in the OpenTelemetry Collector

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- OpenTelemetry Collector
- OTLP HTTP exporter
- OTLP receiver
- Collector processors: batch, memory_limiter, resource
- Collector exporter retry and sending queue configuration
- Collector TLS and HTTP client configuration
- OneUptime OTLP ingestion

## Sources Consulted
- OpenTelemetry Collector OTLP HTTP exporter README: https://github.com/open-telemetry/opentelemetry-collector/blob/main/exporter/otlphttpexporter/README.md
- OpenTelemetry Collector HTTP configuration settings: https://github.com/open-telemetry/opentelemetry-collector/blob/main/config/confighttp/README.md
- OpenTelemetry Collector exporterhelper retry, queue, timeout, and persistent queue docs: https://github.com/open-telemetry/opentelemetry-collector/blob/main/exporter/exporterhelper/README.md
- OpenTelemetry Collector TLS configuration settings: https://github.com/open-telemetry/opentelemetry-collector/blob/main/config/configtls/README.md
- OpenTelemetry Collector configuration docs: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Protocol exporter specification: https://opentelemetry.io/docs/specs/otel/protocol/exporter/
- OpenTelemetry Collector internal telemetry docs: https://opentelemetry.io/docs/collector/internal-telemetry/
- OneUptime OpenTelemetry Collector docs: https://oneuptime.com/docs/en/telemetry/host-otel-collector

## Issues Found
- The post used the deprecated `otlphttp` component name and invalid underscore-suffixed component IDs such as `otlphttp_oneuptime`. Updated examples to the current `otlp_http` exporter name and valid `type/name` IDs such as `otlp_http/oneuptime`.
- Several examples configured `endpoint` with signal-specific paths such as `/v1/traces`. The Collector's OTLP HTTP exporter treats `endpoint` as a base URL and appends signal paths automatically. Updated examples to use base URLs and used `traces_endpoint` where a trace-only destination is intended.
- Environment variable substitution used the older shorthand form such as `${ONEUPTIME_TOKEN}`. Updated configuration snippets to the current documented `${env:ONEUPTIME_TOKEN}` form.
- The compression options list omitted several Collector-supported HTTP compression values. Added `zlib`, `deflate`, and `lz4` while preserving the guidance that backend support is required.
- The retry explanation said intervals double, but the example did not configure the multiplier. Added `multiplier: 2.0` so the example matches the explanation.
- The performance tuning snippet placed `batch` settings under the exporter, which is not valid for the batch processor fields shown. Removed the invalid exporter-level `batch` block and kept the processor-level batch configuration.
- The high-memory troubleshooting advice said to increase the batch timeout to send data faster. Corrected it to reduce the batch timeout or batch size.
- A TLS comment implied that `insecure: false` specifically uses the system certificate pool even when a custom `ca_file` is configured. Reworded it to explain that system CAs are used unless a custom CA is provided.

## Review Notes
The corrected post is technically valid against current OpenTelemetry Collector documentation. Some backend-specific behavior, including OneUptime's accepted base endpoint, depends on the backend implementation and was cross-checked against OneUptime documentation.
