# Validation Summary: How to Configure the OTLP Receiver in the OpenTelemetry Collector

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- OpenTelemetry Collector
- OTLP receiver
- OTLP/gRPC
- OTLP/HTTP
- Collector TLS and mTLS settings
- Collector authentication extensions
- Bearer Token Authenticator extension
- Collector health check, pprof, and zpages extensions
- Collector internal telemetry
- telemetrygen

## Sources Consulted
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/
- OTLP receiver README: https://github.com/open-telemetry/opentelemetry-collector/blob/main/receiver/otlpreceiver/README.md
- OTLP receiver Go package documentation: https://pkg.go.dev/go.opentelemetry.io/collector/receiver/otlpreceiver
- gRPC configuration settings: https://github.com/open-telemetry/opentelemetry-collector/blob/main/config/configgrpc/README.md
- HTTP configuration settings: https://github.com/open-telemetry/opentelemetry-collector/blob/main/config/confighttp/README.md
- TLS configuration settings: https://github.com/open-telemetry/opentelemetry-collector/blob/main/config/configtls/README.md
- Debug exporter README: https://github.com/open-telemetry/opentelemetry-collector/blob/main/exporter/debugexporter/README.md
- Bearer Token Authenticator extension README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/extension/bearertokenauthextension/README.md
- Health Check extension README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/extension/healthcheckextension/README.md
- telemetrygen README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/cmd/telemetrygen/README.md

## Issues Found
- Replaced deprecated `logging` exporter examples and `loglevel` fields with the current `debug` exporter and `verbosity` field.
- Corrected the OTLP HTTP `max_request_body_size` default from "no limit" to `20MiB`.
- Replaced the invalid HTTP path customization example using `endpoint` as a URL path with `traces_url_path`, `metrics_url_path`, and `logs_url_path`.
- Removed unsupported receiver TLS `client_auth_type` settings and explained that `client_ca_file` configures client certificate verification for mTLS.
- Changed Bearer Token Authenticator configuration from the invalid `bearer_token` field to the current `token` field.
- Added missing `debug` exporter definitions to examples that referenced an exporter in a pipeline.
- Updated Collector internal telemetry metrics configuration from the ignored `service.telemetry.metrics.address` field to the current `readers` Prometheus pull exporter form.
- Replaced the `grpcurl` test command, which generally requires server reflection or explicit proto descriptors, with current `telemetrygen` commands for gRPC and HTTP receiver testing.
- Fixed the missing Markdown heading marker on the resource limits section.

## Review Notes
The examples intentionally bind some receivers to `0.0.0.0` for demonstrative deployments. The official Collector documentation recommends preferring `localhost` when all clients are local and being deliberate about public bindings.
