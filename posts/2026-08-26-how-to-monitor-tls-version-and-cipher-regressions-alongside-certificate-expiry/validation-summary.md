# Validation Summary: How to Monitor TLS Version and Cipher Regressions Alongside Certificate Expiry

## Status

validated

## Post Type

Technical guide

## Technologies Covered

- Prometheus blackbox exporter
- Prometheus alerting rules and PromQL
- Go `crypto/tls`
- OpenSSL `s_client`
- Nmap NSE and `ssl-enum-ciphers`
- TLS 1.0 through TLS 1.3, cipher suites, and X.509 certificate expiry monitoring
- CDN, load-balancer, ingress, service-mesh, origin, IPv4, IPv6, and STARTTLS termination points

## Sources Consulted

- [Prometheus blackbox exporter v0.28.0 release](https://github.com/prometheus/blackbox_exporter/releases/tag/v0.28.0)
- [Blackbox exporter v0.28.0 configuration reference](https://github.com/prometheus/blackbox_exporter/blob/v0.28.0/CONFIGURATION.md)
- [Blackbox exporter TLS metric definitions](https://github.com/prometheus/blackbox_exporter/blob/v0.28.0/prober/prober.go)
- [Blackbox exporter HTTP probe implementation](https://github.com/prometheus/blackbox_exporter/blob/v0.28.0/prober/http.go)
- [Blackbox exporter negotiated TLS value implementation](https://github.com/prometheus/blackbox_exporter/blob/v0.28.0/prober/tls.go)
- [Go `crypto/tls` package documentation](https://pkg.go.dev/crypto/tls)
- [Prometheus alerting rules](https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/)
- [Prometheus query functions](https://prometheus.io/docs/prometheus/latest/querying/functions/)
- [Prometheus query operators and aggregation semantics](https://prometheus.io/docs/prometheus/latest/querying/operators/)
- [OpenSSL TLS version options](https://docs.openssl.org/master/man1/openssl/#tls-version-options)
- [OpenSSL `s_client` documentation](https://docs.openssl.org/master/man1/openssl-s_client/)
- [OpenSSL cipher-list documentation](https://docs.openssl.org/master/man1/openssl-ciphers/)
- [OpenSSL certificate verification options](https://docs.openssl.org/master/man1/openssl-verification-options/)
- [Nmap `ssl-enum-ciphers` NSE documentation](https://nmap.org/nsedoc/scripts/ssl-enum-ciphers.html)
- [RFC 9846: The Transport Layer Security (TLS) Protocol Version 1.3](https://www.rfc-editor.org/info/rfc9846)
- [RFC 8996: Deprecating TLS 1.0 and TLS 1.1](https://www.rfc-editor.org/info/rfc8996)
- [Cloudflare SSL/TLS connection model](https://developers.cloudflare.com/ssl/get-started/)
- [AWS Application Load Balancer security policies](https://docs.aws.amazon.com/elasticloadbalancing/latest/application/describe-ssl-policies.html)
- [Envoy downstream and upstream TLS contexts](https://www.envoyproxy.io/docs/envoy/latest/start/quick-start/securing.html)

## Issues Found

- The rollout queries used `count by (instance)`, which discarded `job`, region, address-family, vantage, and other distinguishing labels. Concurrent probes sharing an `instance` value could therefore create false change events. Changed the aggregations to `count without (version)` and `count without (cipher)`, so only the changing TLS label is removed and every other identifying label is preserved.
- The `diagnostic_tls10` module configured TLS bounds but did not require the HTTP probe to use TLS. Because a target without a scheme defaults to cleartext HTTP, a successful plaintext response could contradict the statement that probe success proves TLS 1.0 acceptance. Added `fail_if_not_ssl: true` to make that conclusion valid.
- The legacy-version alert could not fire for the production module shown earlier because `min_version: TLS12` prevents that client from negotiating TLS 1.0 or TLS 1.1. Added a caveat explaining that this rule applies only to probes that permit legacy versions. A legacy-only endpoint makes the strict production probe fail, while detecting legacy support alongside modern support still requires a negative probe or enumeration.
- The documentation list cited RFC 8446 as the current TLS 1.3 specification. RFC 9846 was published in July 2026 and obsoletes RFC 8446 while retaining TLS 1.3 compatibility. Updated the link and title to RFC 9846.

No other technical issues were found.

## Review Notes

- Both blackbox exporter module snippets passed the v0.28.0 `--config.check` validator.
- All four alert expressions and both rollout queries passed `promtool check rules` with Prometheus 3.13.2.
- The OpenSSL command and its version, SNI, hostname-verification, and verification-failure options are current. The post already correctly distinguishes `-cipher` for TLS 1.2 and earlier from `-ciphersuites` for TLS 1.3 and notes local build, provider, and security-level limitations.
- The Nmap command matches the official example, and the post correctly describes the script as intrusive and noisy because it performs many handshakes.
- All external documentation links in the corrected post resolve to the intended official resources.
