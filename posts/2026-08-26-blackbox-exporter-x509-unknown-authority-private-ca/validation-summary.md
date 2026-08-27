# Validation Summary: Fix Blackbox Exporter `x509: Certificate Signed by Unknown Authority`

## Status

validated

## Post Type

Technical guide

## Technologies Covered

- Prometheus Blackbox Exporter
- Prometheus scrape configuration and relabeling
- Go `crypto/tls` and `crypto/x509`
- OpenSSL `s_client` and `x509`
- X.509 certificate chains, private certificate authorities, trust anchors, SNI, and hostname verification
- curl

## Sources Consulted

- [Blackbox Exporter v0.28.0 configuration schema](https://github.com/prometheus/blackbox_exporter/blob/v0.28.0/CONFIGURATION.md#tls_config)
- [Blackbox Exporter v0.28.0 README: debug output and Prometheus configuration](https://github.com/prometheus/blackbox_exporter/blob/v0.28.0/README.md)
- [Blackbox Exporter v0.28.0 HTTP prober implementation](https://github.com/prometheus/blackbox_exporter/blob/5a059bee8d8ffa4e75947c5055fb0abeefc582e6/prober/http.go)
- [Blackbox Exporter v0.28.0 per-probe logger implementation](https://github.com/prometheus/blackbox_exporter/blob/5a059bee8d8ffa4e75947c5055fb0abeefc582e6/prober/handler.go#L223-L240)
- [Prometheus multi-target exporter guide](https://prometheus.io/docs/guides/multi-target-exporter/)
- [Prometheus common v0.67.4 TLS configuration implementation](https://github.com/prometheus/common/blob/v0.67.4/config/http_config.go#L1338-L1346)
- [Go `crypto/x509` package documentation](https://pkg.go.dev/crypto/x509)
- [Go `crypto/tls` package documentation](https://pkg.go.dev/crypto/tls#Config)
- [OpenSSL `s_client` documentation](https://docs.openssl.org/master/man1/openssl-s_client/)
- [OpenSSL certificate-verification options](https://docs.openssl.org/master/man1/openssl-verification-options/)
- [OpenSSL `x509` documentation](https://docs.openssl.org/master/man1/openssl-x509/)
- [curl command-line documentation](https://curl.se/docs/manpage.html)
- [RFC 5280: PKIX Certificate and CRL Profile](https://www.rfc-editor.org/rfc/rfc5280.html)
- [RFC 8446 section 4.4.2: TLS Certificate message](https://www.rfc-editor.org/rfc/rfc8446.html#section-4.4.2)

## Issues Found

- The first OpenSSL command was described as testing an exact trust bundle even though it uses OpenSSL's configured default trust sources. The wording now states that explicitly. The private-root command used `-CAfile`, which can leave other default trust locations enabled; it now uses OpenSSL 3's `-verifyCAfile` so server verification uses the specified private-root file as its separate verification store. This prevents an unintended default trust source from making the diagnostic succeed.
- The rotation procedure applied old-and-new-root steps to a “root or intermediate migration.” An intermediate-only rollover under the same root does not require adding a new trust anchor. The scope now correctly says “root migration.”
- The debug section implied that `debug=true` alone shows resolved addresses and the final request target. Blackbox Exporter filters the returned probe buffer at `--log.prober` (default `info`), while address resolution and per-request URLs are logged at DEBUG. The post now distinguishes what appears at the default level from what requires temporarily using `--log.prober=debug`.

## Review Notes

- The Blackbox module fields, Prometheus relabeling, Host/SNI guidance, custom-root-pool behavior, Go verification explanations, remaining OpenSSL commands, curl command, and documentation links were verified as current and correct.
- The module snippet passed `blackbox_exporter --config.check` with the official v0.28.0 binary; the downloaded release archive matched its published SHA-256 checksum.
- The corrected `-verifyCAfile` diagnostic uses an OpenSSL 3.x option. The post does not otherwise make version-specific claims.
- With verification disabled, `probe_ssl_earliest_cert_expiry` is derived from presented peer certificates and can look healthy even though no chain was verified. Newer verified-chain metrics do not have identical behavior; this does not change the post's warning against `insecure_skip_verify`.
