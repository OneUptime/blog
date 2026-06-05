# Validation Summary: How to Configure OTLP Export with TLS/mTLS for Any Language

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry Protocol (OTLP)
- OpenTelemetry Collector
- TLS and mutual TLS (mTLS)
- OpenSSL
- Go OpenTelemetry OTLP gRPC exporter
- Java OpenTelemetry Java agent and OTLP gRPC exporter
- Python OpenTelemetry OTLP gRPC/HTTP exporters
- Node.js OpenTelemetry OTLP gRPC exporter
- cert-manager for Kubernetes certificates

## Sources Consulted
- OpenTelemetry OTLP exporter specification: https://opentelemetry.io/docs/specs/otel/protocol/exporter/
- OpenTelemetry Collector TLS and mTLS configuration docs: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry SDK OTLP exporter configuration docs: https://opentelemetry.io/docs/languages/sdk-configuration/otlp-exporter/
- OpenTelemetry Java SDK configuration docs: https://opentelemetry.io/docs/languages/java/configuration/
- OpenTelemetry Java `OtlpGrpcSpanExporterBuilder` Javadocs: https://javadoc.io/static/io.opentelemetry/opentelemetry-exporter-otlp/1.62.0/io/opentelemetry/exporter/otlp/trace/OtlpGrpcSpanExporterBuilder.html
- OpenTelemetry Go `otlptracegrpc` package docs: https://pkg.go.dev/go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracegrpc
- OpenTelemetry Python OTLP exporter docs: https://opentelemetry-python.readthedocs.io/en/stable/exporter/otlp/otlp.html
- OpenTelemetry JavaScript OTLP gRPC exporter docs: https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_exporter-trace-otlp-grpc.html
- OpenSSL command help from local OpenSSL 3.0.13
- cert-manager Certificate API docs: https://cert-manager.io/docs/reference/api-docs/

## Issues Found
- The OpenSSL key-generation commands used `openssl genrsa`, which can produce PKCS#1 RSA private keys on some OpenSSL versions. The current OpenTelemetry Java OTLP builder requires the client key passed to `setClientTls` to be PKCS#8 PEM. Changed the key generation commands to `openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:4096`, which produces PKCS#8 PEM keys.
- The Go sample returned `*otlptracegrpc.Exporter`, but `otlptracegrpc.New` returns `*otlptrace.Exporter`. Added the `otlptrace` import and corrected the return type.
- The Java programmatic exporter sample used Netty's shaded `SslContext` and passed it to `.setSslContext(sslContext)`. Current OpenTelemetry Java `OtlpGrpcSpanExporterBuilder` does not accept that Netty type; it supports PEM byte arrays via `.setTrustedCertificates(...)` and `.setClientTls(...)`, or a Java `SSLContext` overload with a trust manager. Replaced the sample with the PEM byte-array builder APIs.
- The Java programmatic sample showed a `public` method at the top level, which is not valid Java syntax. Wrapped it in a small `TelemetryExporter` class.
- The Python programmatic sample created an `ssl.SSLContext` but never used it. Removed the unused SSL context block and kept the actual `grpc.ssl_channel_credentials(...)` object that is passed to `OTLPSpanExporter`.
- The conclusion claimed every OpenTelemetry SDK supports TLS configuration through environment variables. OpenTelemetry's SDK configuration docs note that environment-variable support varies by language, so the sentence was narrowed to refer to the standard OTLP variables and SDKs that implement them.

## Review Notes
The Collector receiver TLS fields, OTLP environment variable names, Go gRPC TLS credential setup, Node.js gRPC `createSsl` usage, and cert-manager `Certificate` shape match the referenced documentation. The examples are trace-exporter focused; production deployments should repeat equivalent exporter configuration for metrics and logs where those signals are enabled.
