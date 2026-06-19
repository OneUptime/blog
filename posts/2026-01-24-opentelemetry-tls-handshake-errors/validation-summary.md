# Validation Summary: How to Fix 'TLS Handshake' Errors in OpenTelemetry

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- OpenTelemetry SDKs and OTLP exporters
- OpenTelemetry Collector TLS configuration
- TLS, SSL certificates, certificate authorities, and mTLS
- Python, Go, and Node.js OpenTelemetry exporter configuration
- gRPC and OTLP/HTTP
- OpenSSL
- Kubernetes and cert-manager

## Sources Consulted
- OpenTelemetry Protocol Exporter specification: https://opentelemetry.io/docs/specs/otel/protocol/exporter/
- OpenTelemetry Collector TLS configuration documentation: https://github.com/open-telemetry/opentelemetry-collector/blob/main/config/configtls/README.md
- OpenTelemetry Python OTLP exporter API documentation: https://opentelemetry-python.readthedocs.io/en/latest/exporter/otlp/otlp.html
- OpenTelemetry JavaScript exporter documentation: https://opentelemetry.io/docs/languages/js/exporters/
- OpenTelemetry Go OTLP gRPC exporter API documentation: https://pkg.go.dev/go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracegrpc
- Go crypto/tls package documentation: https://pkg.go.dev/crypto/tls
- gRPC environment variables reference: https://grpc.github.io/grpc/core/md_doc_environment_variables.html
- cert-manager API reference: https://cert-manager.io/docs/reference/api-docs/
- Local OpenSSL help output for `s_client` flags.

## Issues Found
- The TLS handshake diagram used TLS 1.2 message names without saying so. Added a note that the diagram is a simplified TLS 1.2-style flow and that TLS 1.3 uses a shorter handshake.
- The OpenSSL chain-inspection command claimed to show the full certificate chain but piped the output into `openssl x509`, which inspects only one certificate. Updated the comment to say it inspects the leaf certificate.
- The server certificate inspection command wrote to `server-cert.txt`, while the self-signed verification command referenced a different filename. Updated the output filename and verification command to use `server-cert.crt`.
- The Python debug logging example attempted to imply TLS verification configuration through `ssl.SSLContext.verify_mode`. Replaced it with application, OpenTelemetry, gRPC, and HTTP debug logging setup.
- The gRPC debug command used `GRPC_VERBOSITY=DEBUG`, which the official gRPC documentation marks deprecated. Removed it from the command and added a legacy-runtime caveat.
- The Go examples used deprecated `ioutil.ReadFile`. Updated them to `os.ReadFile`.
- One Go example imported `google.golang.org/grpc` without using it, which would fail compilation. Removed the unused import.
- The Go TLS example listed TLS 1.3 cipher suites in `tls.Config.CipherSuites`, but Go documents that field as applying only to TLS 1.0-1.2 and that TLS 1.3 cipher suites are not configurable. Removed the TLS 1.3 suites and added an explanatory comment.
- The Collector cipher-suite example also mixed TLS 1.3 suite names into an explicit cipher-suite list. Removed the TLS 1.3 suite names.
- The expired-certificate workaround section described an HTTP exporter with a custom SSL context even though the Python OTLP HTTP exporter example did not support passing that context. Reworded the section as an OTLP/HTTP insecure temporary workaround and changed the endpoint to `http://`.
- Environment-variable examples used port `4317` without setting the OTLP protocol. Added `OTEL_EXPORTER_OTLP_PROTOCOL=grpc` where the examples target OTLP/gRPC.

## Review Notes
The remaining examples are intentionally illustrative and use placeholder hostnames, certificate paths, and container images. `otel/opentelemetry-collector-contrib:latest` works as an example but should be pinned to a specific version in production deployments.
