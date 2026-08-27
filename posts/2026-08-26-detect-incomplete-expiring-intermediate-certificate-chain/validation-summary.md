# Validation Summary: Detect Incomplete or Expiring Intermediate Certificate Chains

## Status
validated

## Post Type
Technical guide

## Technologies Covered

- TLS certificate chains and X.509/PKIX path validation
- Intermediate certificate authorities, trust anchors, cross-signing, and Authority Information Access
- OpenSSL 3.x `s_client`, `verify`, and `x509`
- Bash and AWK
- Prometheus Blackbox Exporter 0.28.0
- PromQL
- Go `crypto/tls` and `crypto/x509`

## Sources Consulted

- [OpenSSL `s_client` documentation](https://docs.openssl.org/master/man1/openssl-s_client/)
- [OpenSSL `verify` documentation](https://docs.openssl.org/master/man1/openssl-verify/)
- [OpenSSL `x509` documentation](https://docs.openssl.org/master/man1/openssl-x509/)
- [OpenSSL certification-path and trust-store options](https://docs.openssl.org/master/man1/openssl-verification-options/)
- [RFC 8446 Section 4.4.2: TLS certificate-list ordering and trust-anchor omission](https://www.rfc-editor.org/rfc/rfc8446.html#section-4.4.2)
- [RFC 5280 Section 6: Certification Path Validation](https://www.rfc-editor.org/rfc/rfc5280.html#section-6)
- [RFC 4158 Section 6.3: Certificate Retrieval](https://www.rfc-editor.org/rfc/rfc4158.html#section-6.3)
- [Blackbox Exporter 0.28.0 TLS metric calculations](https://github.com/prometheus/blackbox_exporter/blob/v0.28.0/prober/tls.go)
- [Blackbox Exporter 0.28.0 TLS metric definitions](https://github.com/prometheus/blackbox_exporter/blob/v0.28.0/prober/prober.go)
- [Blackbox Exporter 0.28.0 HTTP prober](https://github.com/prometheus/blackbox_exporter/blob/v0.28.0/prober/http.go)
- [Blackbox Exporter 0.28.0 TCP and Unix TLS probe path](https://github.com/prometheus/blackbox_exporter/blob/v0.28.0/prober/query_response.go)
- [Blackbox Exporter 0.28.0 gRPC prober](https://github.com/prometheus/blackbox_exporter/blob/v0.28.0/prober/grpc.go)
- [Blackbox Exporter configuration reference](https://github.com/prometheus/blackbox_exporter/blob/v0.28.0/CONFIGURATION.md)
- [Go `tls.ConnectionState` documentation](https://pkg.go.dev/crypto/tls#ConnectionState)
- [Go `x509.Certificate.Verify` documentation](https://pkg.go.dev/crypto/x509#Certificate.Verify)
- [Microsoft: Authority Information Access certificate retrieval](https://learn.microsoft.com/en-us/windows-server/security/authority-information-access-retrieval)
- [Prometheus `time()` function](https://prometheus.io/docs/prometheus/latest/querying/functions/#time)
- [PromQL comparison operators](https://prometheus.io/docs/prometheus/latest/querying/operators/#comparison-binary-operators)

## Issues Found

- The description of `probe_ssl_last_chain_expiry_timestamp_seconds` did not explain its actual calculation. Clarified that Blackbox Exporter takes the earliest `NotAfter` in each verified path, including its trust anchor, and then selects the latest of those per-path values. This is the expiry time of the last currently verified path.
- The last-chain metric was described as generally exposed by Blackbox Exporter, but the current gRPC prober does not emit it. Scoped the claim to the HTTP and TLS-enabled TCP/Unix probers that emit the metric.
- The peer-certificate expiry discussion could be read as covering every TLS hop followed by an HTTP probe. Clarified that the HTTP gauges represent only the final redirect response, are absent for a plain-HTTP final response, and require separate per-hop probes or disabled redirects when each chain must be monitored. Added the applicable `fail_if_not_ssl` safeguard.

## Review Notes

- All OpenSSL flags and Bash/AWK snippets were checked against current official documentation and tested with OpenSSL 3.6.2. The capture, extraction, direct verification, and expiry-check flows worked as described.
- `-CAstore` and `-no-CAstore` are OpenSSL 3.0-and-later options. The post's wording about current OpenSSL releases is accurate, but the commands are not directly compatible with OpenSSL 1.1.1 or LibreSSL.
- If certificate capture produces no PEM files, Bash's unmatched `cert-*.pem` glob remains literal and the later OpenSSL command fails with a parse error. This fails closed rather than producing a false success; an explicit `cert-01.pem` existence check would make future diagnostics clearer.
- All external links in the post returned successfully and pointed to the intended official or authoritative resources at review time.
