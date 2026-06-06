# Validation Summary: How to Configure TLS Encryption for the OpenTelemetry Collector

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector receivers and exporters
- TLS and mutual TLS (mTLS)
- OpenSSL certificate generation commands
- Kubernetes
- cert-manager Certificate resources

## Sources Consulted
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/
- OpenTelemetry Collector configtls package documentation: https://pkg.go.dev/go.opentelemetry.io/collector/config/configtls
- OpenTelemetry Collector attributes processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/attributesprocessor/README.md
- OpenTelemetry Collector Prometheus Remote Write exporter README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/prometheusremotewriteexporter/README.md
- OpenTelemetry Collector Jaeger receiver test configuration: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/jaegerreceiver/testdata/config.yaml
- OpenTelemetry Collector Zipkin receiver source configuration: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/zipkinreceiver/config.go
- OpenTelemetry Collector Elasticsearch exporter test configuration: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/elasticsearchexporter/testdata/config.yaml
- OpenSSL req documentation: https://docs.openssl.org/3.4/man1/openssl-req/
- OpenSSL x509 documentation: https://docs.openssl.org/3.3/man1/openssl-x509/
- cert-manager Certificate documentation: https://cert-manager.io/docs/usage/certificate/

## Issues Found
- The mTLS receiver examples used `client_auth_type: RequireAndVerifyClientCert`, but current OpenTelemetry Collector `configtls.ServerConfig` does not expose a `client_auth_type` field. The documented way to require and verify client certificates is to set `client_ca_file`, which sets `ClientAuth` to `RequireAndVerifyClientCert`. Removed `client_auth_type` from both examples and clarified the comment.
- The mTLS example attempted to extract `tls.client.subject` and `tls.client.issuer` via the attributes processor `from_context`. The attributes processor only documents receiver metadata, authenticator context, and `client.address` as context sources; it does not expose arbitrary TLS certificate subject or issuer values from the connection. Removed the unsupported processor example.
- The Prometheus Remote Write exporter used the deprecated `prometheusremotewrite` component name. Updated it to the current `prometheus_remote_write` name and updated the pipeline reference.
- The certificate rotation script generated new certificates in the current directory but copied from `/tmp/new-certs`. Updated the script to create and switch into `NEW_CERT_DIR` before generation while preserving a path back to the helper scripts.

## Review Notes
The remaining snippets use broadly valid Collector TLS settings. The `otel/opentelemetry-collector-contrib:latest` Kubernetes image tag is technically valid but is not ideal for production because it is not pinned to a specific Collector version.
