# Validation Summary: How to Fix 'Invalid Endpoint' Collector Errors

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- OpenTelemetry Collector
- OTLP gRPC and OTLP HTTP exporters
- OpenTelemetry Collector receivers, exporters, processors, and extensions
- Jaeger, Zipkin, Prometheus, and OneUptime backend configuration
- Collector environment variable substitution and validation commands

## Sources Consulted
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/
- OpenTelemetry Protocol exporter specification: https://opentelemetry.io/docs/specs/otel/protocol/exporter/
- OTLP HTTP exporter README: https://github.com/open-telemetry/opentelemetry-collector/blob/main/exporter/otlphttpexporter/README.md
- OTLP receiver README: https://github.com/open-telemetry/opentelemetry-collector/blob/main/receiver/otlpreceiver/README.md
- OpenTelemetry Collector changelog for `otlp_grpc` and `otlp_http` exporter renames: https://github.com/open-telemetry/opentelemetry-collector/blob/main/CHANGELOG.md
- OpenTelemetry Jaeger exporter migration guidance: https://opentelemetry.io/blog/2023/jaeger-exporter-collector-migration/
- OneUptime OpenTelemetry documentation: https://oneuptime.com/docs/en/telemetry/open-telemetry
- OneUptime host OpenTelemetry Collector documentation: https://oneuptime.com/docs/en/telemetry/host-otel-collector

## Issues Found
- The post treated a missing URL scheme as invalid for the OTLP gRPC exporter. Current OTLP gRPC exporter configuration accepts gRPC-style targets and URL-style endpoints, while OTLP HTTP requires a URL scheme. I changed that section to focus on malformed OTLP HTTP exporter URLs.
- The post used deprecated `otlp` and `otlphttp` exporter component names. I updated examples to `otlp_grpc` and `otlp_http`, while leaving the OTLP receiver name as `otlp`.
- The post described an OTLP HTTP base endpoint without signal paths as wrong. Current `otlp_http` behavior appends `/v1/traces`, `/v1/metrics`, and `/v1/logs` to the base endpoint. I changed that example to mark the base endpoint as valid and signal-specific endpoints as override options.
- The complete configuration used the removed native `jaeger` exporter. I replaced it with an OTLP gRPC exporter instance targeting a Jaeger backend that accepts OTLP.
- The OneUptime endpoint examples used `https://api.oneuptime.com` and generic bearer authorization. I updated them to OneUptime's documented `https://oneuptime.com/otlp` endpoint and `x-oneuptime-token` header, including JSON encoding where documented.
- The Collector internal metrics example used `service.telemetry.metrics.address`, which current Collector documentation says is ignored as of v0.123.0. I replaced it with the current `readers`/Prometheus pull exporter form.
- The environment variable examples used legacy-style `${VAR}` substitutions. I updated them to the current Collector configuration provider form, such as `${env:BACKEND_ENDPOINT}` and `${env:VAR:-default}`.
- A Prometheus scrape target comment incorrectly called `localhost:8080` a full URL. I corrected it to host:port.
- The TLS troubleshooting flowchart suggested `insecure: true` for HTTP. I changed it to clarify plaintext gRPC handling with `http://` or `tls.insecure`.

## Review Notes
The post is now technically aligned with current upstream OpenTelemetry Collector documentation. Some component availability still depends on the Collector distribution; for example, Jaeger and Zipkin receivers are typically available in the contrib distribution rather than every custom build.
