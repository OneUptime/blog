# Validation Summary: How to Fix OpenTelemetry Exporter Authentication Failures

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- OpenTelemetry OTLP exporters
- OpenTelemetry Collector
- Collector TLS configuration
- Collector OAuth2 and bearer token authentication extensions
- Python OpenTelemetry OTLP exporters
- Go OpenTelemetry OTLP exporters
- gRPC, HTTP, TLS, and mTLS
- OpenSSL, curl, netcat, grpcurl, and JWT decoding

## Sources Consulted
- OpenTelemetry OTLP exporter specification: https://opentelemetry.io/docs/specs/otel/protocol/exporter/
- OpenTelemetry SDK environment variable specification: https://opentelemetry.io/docs/specs/otel/configuration/sdk-environment-variables/
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/
- OpenTelemetry Collector TLS configuration documentation: https://pkg.go.dev/go.opentelemetry.io/collector/config/configtls
- OpenTelemetry Collector OTLP gRPC exporter README: https://github.com/open-telemetry/opentelemetry-collector/blob/main/exporter/otlpexporter/README.md
- OpenTelemetry Collector OTLP HTTP exporter README: https://github.com/open-telemetry/opentelemetry-collector/blob/main/exporter/otlphttpexporter/README.md
- OpenTelemetry Collector OAuth2 client authenticator README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/extension/oauth2clientauthextension/README.md
- OpenTelemetry Collector bearer token authenticator README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/extension/bearertokenauthextension/README.md
- OpenTelemetry Python OTLP exporter API docs: https://opentelemetry-python.readthedocs.io/en/latest/exporter/otlp/otlp.html
- OpenTelemetry Go OTLP trace gRPC exporter docs: https://pkg.go.dev/go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracegrpc
- gRPC Go credentials package docs: https://pkg.go.dev/google.golang.org/grpc/credentials
- Local OpenSSL, curl, and netcat command help output

## Issues Found
- Updated Collector OTLP exporter examples from deprecated `otlp` and `otlphttp` component type aliases to current `otlp_grpc` and `otlp_http` names, and updated pipeline exporter references accordingly.
- Fixed the Go exporter example so it compiles with current OpenTelemetry Go APIs by importing `context`, importing `otlptrace`, and returning `*otlptrace.Exporter` instead of the non-existent `*otlptracegrpc.Exporter`.
- Fixed the OpenSSL server certificate command to pass `-servername backend.example.com`, so SNI-enabled endpoints return the intended certificate.
- Replaced the JWT expiry command with a Python base64url decoder because JWT payloads are base64url encoded and may omit padding, which makes a plain `base64 -d` pipeline unreliable.
- Removed the claim that `bearertokenauth` watches token files and automatically updates them. The official extension documentation confirms `filename` reads token values from a file but does not document that automatic watch behavior for this extension.
- Corrected the description of exporter retry behavior to clarify that OTLP exporters retry transient failures, while authentication failures such as 401/403 or gRPC `UNAUTHENTICATED` are generally permanent export failures rather than ordinary retry cases.

## Review Notes
- `grpcurl` was not installed locally, so the `grpcurl -insecure ... list` example was reviewed against official usage expectations rather than local help output.
- The Python examples are syntactically valid and use current OTLP exporter parameters. The `ssl` import in the custom CA example is unused but harmless.
- Collector Prometheus internal metrics may appear with a `_total` suffix depending on the Collector's Prometheus exporter configuration; the post's metric names are the OTLP-format names used by OpenTelemetry documentation.
