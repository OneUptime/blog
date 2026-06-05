# Validation Summary: How to Configure the Zipkin Receiver in the OpenTelemetry Collector

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector Zipkin receiver
- OpenTelemetry Collector debug, OTLP, Zipkin, and Prometheus exporters
- OpenTelemetry Collector processors: batch, memory_limiter, resource, attributes, probabilistic_sampler
- Zipkin API formats: JSON and Protobuf
- Brave Java Zipkin client
- py_zipkin
- zipkin-js
- TLS, CORS, and HTTP server settings

## Sources Consulted
- OpenTelemetry Collector Zipkin receiver README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/zipkinreceiver/README.md
- OpenTelemetry Collector Zipkin receiver config source: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/zipkinreceiver/config.go
- OpenTelemetry Collector HTTP server configuration docs: https://github.com/open-telemetry/opentelemetry-collector/blob/main/config/confighttp/README.md
- OpenTelemetry Collector TLS configuration docs: https://github.com/open-telemetry/opentelemetry-collector/blob/main/config/configtls/README.md
- OpenTelemetry Collector debug exporter README: https://github.com/open-telemetry/opentelemetry-collector/blob/main/exporter/debugexporter/README.md
- OpenTelemetry Collector OTLP exporter README: https://github.com/open-telemetry/opentelemetry-collector/blob/main/exporter/otlpexporter/README.md
- OpenTelemetry Collector Zipkin exporter README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/zipkinexporter/README.md
- OpenTelemetry Collector memory limiter processor README: https://github.com/open-telemetry/opentelemetry-collector/blob/main/processor/memorylimiterprocessor/README.md
- OpenTelemetry internal telemetry docs: https://opentelemetry.io/docs/collector/internal-telemetry/
- Zipkin v2 API definition: https://github.com/openzipkin/zipkin-api/blob/master/zipkin2-api.yaml

## Issues Found
- The basic configuration used the removed `logging` exporter. Replaced it with the current `debug` exporter and updated the surrounding explanation.
- `parse_string_tags` was described as JSON object parsing. Corrected it to primitive int/bool/float parsing based on the Zipkin receiver documentation, and replaced the JSON-object example.
- The CORS example used unsupported or incorrect fields: `expose_headers`, `allowed_methods`, and `allow_credentials`. Changed `expose_headers` to `exposed_headers` and removed unsupported fields.
- The request-size section said the default was unlimited. Corrected it to the current default of 20 MiB.
- The production and metrics examples used the legacy `service.telemetry.metrics.address` field. Replaced it with the current `metrics.readers.pull.exporter.prometheus.host/port` schema.
- The production example included an unused Prometheus exporter under top-level `exporters`. Removed it and kept monitoring under service telemetry.
- The Java Brave example was missing imports for `zipkin2.Span` and `java.util.concurrent.TimeUnit`. Added both imports.
- The architecture diagram placed the memory limiter after the batch processor. Updated the flow to match the production pipeline and the memory limiter best practice of placing it first.
- The HTTP tuning example used an invalid nested `http_server_settings` block and unsupported `max_header_size`. Moved supported timeout fields directly under the Zipkin receiver.
- The protocol diagrams only labeled JSON v2 while the receiver supports Zipkin V1 and V2. Updated labels to JSON v1/v2.

## Review Notes
Validated representative Collector configurations with `otelcol-contrib version 0.153.0`: the basic config, production-shaped config, HTTP tuning/internal telemetry config, and health check config all passed `otelcol-contrib validate`. TLS validation used temporary local certificate files because the post's certificate paths are deployment-specific placeholders.
