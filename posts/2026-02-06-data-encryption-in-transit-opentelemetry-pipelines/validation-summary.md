# Validation Summary: How to Implement Data Encryption in Transit for OpenTelemetry Pipelines

## Status
validated

## Post Type
Technical guide / implementation tutorial

## Technologies Covered
- OpenTelemetry SDKs
- OpenTelemetry Collector
- OTLP over gRPC
- OTLP over HTTP/protobuf
- TLS and certificate validation
- Python, Java, and Node.js OpenTelemetry exporters
- OpenSSL and kubectl verification commands

## Sources Consulted
- OpenTelemetry OTLP Exporter Configuration: https://opentelemetry.io/docs/concepts/sdk-configuration/otlp-exporter-configuration/
- OpenTelemetry Protocol Exporter Specification: https://opentelemetry.io/docs/specs/otel/protocol/exporter/
- OpenTelemetry Collector Configuration, TLS examples: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector configtls package documentation: https://pkg.go.dev/go.opentelemetry.io/collector/config/configtls
- OpenTelemetry Python OTLP exporter API documentation: https://opentelemetry-python.readthedocs.io/en/latest/exporter/otlp/otlp.html
- OpenTelemetry Java SDK configuration documentation: https://opentelemetry.io/docs/languages/java/configuration/
- OpenTelemetry JavaScript exporter documentation: https://opentelemetry.io/docs/languages/js/exporters/
- Go crypto/tls Config documentation: https://pkg.go.dev/crypto/tls#Config

## Issues Found
- The Python SDK example passed `credentials=None` while claiming that a CA certificate would be used to verify the collector. Updated the example to load the CA certificate and pass `grpc.ssl_channel_credentials(root_certificates=ca_cert)` to `OTLPSpanExporter`.
- The TLS 1.3 example configured `cipher_suites` with TLS 1.3 cipher suites. Go's TLS configuration, which the Collector uses, does not allow configuring TLS 1.3 cipher suites through `CipherSuites`; that field applies to TLS 1.0-1.2. Removed the `cipher_suites` list from the TLS 1.3 example and added a note that Go selects TLS 1.3 cipher suites.
- The verification section said a successful Collector setup would show the certificate being loaded in logs. That is not a reliable success condition. Updated the text to recommend using Collector logs to find TLS-related startup, handshake, or verification errors.

## Review Notes
The remaining Collector TLS fields, OTLP endpoint patterns, Java agent properties, Node.js gRPC credentials usage, and OpenSSL commands are consistent with the official documentation reviewed. The post intentionally uses example hostnames and certificate paths; those must match each deployment's DNS names and certificate SANs.
