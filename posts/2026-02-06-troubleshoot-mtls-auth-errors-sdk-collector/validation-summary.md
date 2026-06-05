# Validation Summary: How to Troubleshoot mTLS Authentication Errors Between Application SDKs

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Protocol (OTLP) gRPC receiver
- OpenTelemetry Go OTLP trace exporter
- OpenTelemetry Python OTLP trace exporter
- gRPC TLS/mTLS credentials
- X.509 certificates and certificate authorities
- OpenSSL certificate inspection and handshake testing
- Kubernetes Deployment and Secret volume mounts

## Sources Consulted
- OpenTelemetry Collector configuration docs: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector TLS config package docs: https://pkg.go.dev/go.opentelemetry.io/collector/config/configtls
- OpenTelemetry Go OTLP trace gRPC exporter docs: https://pkg.go.dev/go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracegrpc
- OpenTelemetry Python OTLP exporter docs: https://opentelemetry-python.readthedocs.io/en/stable/exporter/otlp/otlp.html
- gRPC Python API docs for SSL channel credentials: https://grpc.github.io/grpc/python/grpc.html#grpc.ssl_channel_credentials
- Kubernetes Deployment docs: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- OpenSSL verify docs: https://docs.openssl.org/1.1.1/man1/verify/
- OpenSSL s_client docs: https://docs.openssl.org/3.0/man1/openssl-s_client/
- Local OpenSSL help output from OpenSSL 3.0.13

## Issues Found
- The Go SDK example used `context.Background()` without importing the Go standard library `context` package. Added the missing import so the example is syntactically correct.
- The Kubernetes `apps/v1` Deployment snippet omitted the required `.spec.selector` and matching pod template labels. Added `selector.matchLabels` and `template.metadata.labels` using `app: otel-collector`.

## Review Notes
The Collector `tls.client_ca_file` configuration is accurate for requiring and verifying client certificates. The Go and Python exporter examples use current OTLP gRPC exporter and gRPC TLS credential APIs. The OpenSSL commands use valid options; for a stricter future example, the direct `s_client` test could also include hostname verification when the certificate's DNS SAN is important to diagnose.
