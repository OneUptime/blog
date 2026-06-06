# Validation Summary: How to Configure Mutual TLS (mTLS) for the OpenTelemetry Collector

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- OpenTelemetry Collector
- OTLP receiver and exporters
- Mutual TLS (mTLS)
- X.509 certificates and OpenSSL
- Go OpenTelemetry OTLP gRPC exporter
- Kubernetes Secrets and Deployments

## Sources Consulted
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector TLS config package documentation: https://pkg.go.dev/go.opentelemetry.io/collector/config/configtls
- OpenTelemetry Collector debug exporter documentation: https://pkg.go.dev/go.opentelemetry.io/collector/exporter/debugexporter
- OpenTelemetry Go OTLP trace gRPC exporter documentation: https://pkg.go.dev/go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracegrpc
- Go crypto/x509 package documentation: https://pkg.go.dev/crypto/x509
- OpenSSL req command documentation: https://docs.openssl.org/3.2/man1/openssl-req/
- OpenSSL x509 command documentation: https://docs.openssl.org/3.3/man1/openssl-x509/
- Kubernetes Secrets documentation: https://kubernetes.io/docs/concepts/configuration/secret/
- Kubernetes secret volume documentation: https://kubernetes.io/docs/concepts/storage/volumes/#secret

## Issues Found
- The OpenSSL certificate generation commands created certificates with only Common Names and no Subject Alternative Names. Modern Go certificate verification ignores the legacy Common Name field for hostname verification, so the sample Go exporter could fail to verify the collector certificate. Added SAN and extended key usage extensions to the generated server and client certificates.
- The first Collector example used the deprecated/removed `logging` exporter with `loglevel`. Current Collector examples should use the `debug` exporter with `verbosity`, so the sample was updated accordingly.
- The receiver TLS comment implied there was a configurable client certificate mode field with values such as `require_and_verify_client_cert`. In the Collector TLS server config, setting `client_ca_file` enables `RequireAndVerifyClientCert`; `client_ca_file_reload` only controls CA reload behavior. Updated the comment to describe the actual field.
- The exporter TLS comment said `server_name_override` must match the certificate CN or SAN. Go's certificate verification ignores legacy CN matching, so the wording was corrected to require a matching SAN.

## Review Notes
The remaining Collector TLS fields (`cert_file`, `key_file`, `client_ca_file`, `client_ca_file_reload`, `ca_file`, `server_name_override`, `min_version`, and `max_version`) match current Collector TLS configuration documentation. The Go OTLP gRPC exporter API usage is current. The Kubernetes Secret and volume mount pattern is valid, though production manifests should also include the Collector configuration and avoid mutable `latest` image tags.
