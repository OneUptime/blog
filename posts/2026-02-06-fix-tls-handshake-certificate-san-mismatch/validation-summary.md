# Validation Summary: How to Fix TLS Handshake Failures When Certificate SANs Do Not Match the

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- TLS and X.509 certificates
- Subject Alternative Names (SANs)
- OpenTelemetry Collector
- OpenTelemetry OTLP/gRPC Python exporter
- Kubernetes Secrets and service DNS names
- cert-manager Certificate resources
- OpenSSL CLI

## Sources Consulted
- RFC 6125, Representation and Verification of Domain-Based Application Service Identity within TLS: https://www.rfc-editor.org/rfc/rfc6125
- OpenTelemetry Protocol Exporter specification: https://opentelemetry.io/docs/specs/otel/protocol/exporter/
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Python OTLP exporter API documentation: https://opentelemetry-python.readthedocs.io/en/stable/exporter/otlp/otlp.html
- gRPC Python API documentation for ssl_channel_credentials: https://grpc.github.io/grpc/python/grpc.html#grpc.ssl_channel_credentials
- cert-manager API reference for Certificate resources: https://cert-manager.io/docs/reference/api-docs/
- Kubernetes DNS for Services and Pods documentation: https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/
- Local OpenSSL 3.0.13 CLI help for req and x509 command options.

## Issues Found
- The Python OTLP/gRPC client example passed `ssl.create_default_context()` to `OTLPSpanExporter(credentials=...)`. The OpenTelemetry Python exporter expects a gRPC `ChannelCredentials` object, and gRPC Python creates those with `grpc.ssl_channel_credentials()`. Updated the example to import `grpc`, read the CA certificate as bytes, construct `grpc.ssl_channel_credentials(root_certificates=...)`, and pass that credentials object.
- The Python endpoint example omitted the URL scheme. The OTLP exporter specification says OTLP/gRPC endpoints must accept `http` or `https` URL schemes and that `https` indicates a secure connection. Updated the example endpoint to `https://otel-collector.observability.svc.cluster.local:4317`.

## Review Notes
The Collector TLS configuration, cert-manager `dnsNames` and `ipAddresses` fields, Kubernetes service DNS name examples, OpenSSL commands, and `OTEL_EXPORTER_OTLP_INSECURE` workaround were consistent with the consulted documentation. The title appears truncated, but that is an editorial issue rather than a technical correctness issue.
