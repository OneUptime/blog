# Validation Summary: How to Troubleshoot Collector Certificate and TLS Errors

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- OpenTelemetry Collector
- OTLP gRPC and HTTP receivers/exporters
- TLS and mutual TLS (mTLS)
- X.509 certificates and certificate chains
- OpenSSL
- curl
- Kubernetes Secrets
- cert-manager
- telemetrygen

## Sources Consulted
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector `configtls` package documentation: https://pkg.go.dev/go.opentelemetry.io/collector/config/configtls@v1.57.0
- OpenTelemetry `telemetrygen` command documentation: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/cmd/telemetrygen
- cert-manager kubectl installation documentation: https://cert-manager.io/docs/installation/kubectl/
- cert-manager API reference: https://cert-manager.io/docs/reference/api-docs/
- Kubernetes Secrets documentation: https://kubernetes.io/docs/concepts/configuration/secret/
- OpenSSL `s_client` documentation: https://docs.openssl.org/3.4/man1/openssl-s_client/

## Issues Found
- The post said each TLS connection requires a certificate, private key, and CA certificate. I changed this to clarify that the server needs the certificate and private key, while clients need trust material; mTLS clients also need their own certificate and key.
- The hostname mismatch explanation relied on CN or SAN. I updated it to emphasize SANs because modern TLS clients generally require SANs and should not rely on CN fallback.
- The self-signed exporter example combined trusting a custom CA with skipping verification in one exporter config, and previously used `insecure: true` as though it only disabled certificate validation. I split the options into separate exporters and kept `insecure_skip_verify` for the TLS-without-verification case.
- The self-signed certificate commands generated certificates with only a CN. I added SAN extensions to the self-signed certificate examples so hostname verification works with modern clients.
- Receiver examples used `client_auth_type`, which is not a current OpenTelemetry Collector TLS config field. I removed it and clarified that `client_ca_file` requires and verifies client certificates.
- The incomplete-chain example included the root certificate in the served full chain. I changed the example to concatenate the server certificate with intermediates only.
- The cert-manager install manifest referenced the old `v1.13.0` release. I updated it to the current documented `v1.20.2` manifest URL.
- The telemetrygen Docker command referenced `/client.crt` and `/client.key` without mounting them. I added volume mounts for both files.
- The monitoring section claimed a Prometheus exporter example but configured `pprof`, which does not expose certificate expiration metrics. I replaced that with a note that certificate expiration needs external monitoring unless another component provides those metrics.

## Review Notes
I could not execute `telemetrygen --help` locally because `go` is not installed in this workspace. The telemetrygen command shape was checked against the official module documentation and current package information instead.
