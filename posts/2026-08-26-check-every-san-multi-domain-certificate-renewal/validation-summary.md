# Validation Summary: Check Every SAN After a Multi-Domain Certificate Renewal

## Status
validated

## Post Type
Technical guide

## Technologies Covered

- TLS service identity and Server Name Indication (SNI)
- X.509 Subject Alternative Name (SAN) and PKIX certificates
- OpenSSL command-line tools
- Python 3
- Python `cryptography`
- Prometheus
- Prometheus Blackbox Exporter
- YAML configuration

## Sources Consulted

- [RFC 9525: Service Identity in TLS](https://www.rfc-editor.org/rfc/rfc9525.html)
- [RFC 5280 Section 4.2.1.6: Subject Alternative Name](https://www.rfc-editor.org/rfc/rfc5280.html#section-4.2.1.6)
- [RFC 5890: IDNA Definitions and Document Framework](https://www.rfc-editor.org/rfc/rfc5890.html)
- [CA/Browser Forum TLS Baseline Requirements Section 7.1.2.7.12](https://cabforum.org/working-groups/server/baseline-requirements/requirements/#712712-subscriber-certificate-subject-alternative-name)
- [OpenSSL current release information](https://www.openssl-library.org/source/)
- [OpenSSL `x509` documentation](https://docs.openssl.org/master/man1/openssl-x509/)
- [OpenSSL `s_client` documentation](https://docs.openssl.org/master/man1/openssl-s_client/)
- [OpenSSL 4.0 `X509_check_host` documentation](https://docs.openssl.org/4.0/man3/X509_check_host/)
- [OpenSSL certificate verification options](https://docs.openssl.org/4.0/man1/openssl-verification-options/)
- [Python `cryptography` X.509 reference](https://cryptography.io/en/latest/x509/reference/)
- [Blackbox Exporter v0.28.0 release](https://github.com/prometheus/blackbox_exporter/releases/tag/v0.28.0)
- [Blackbox Exporter v0.28.0 configuration reference](https://github.com/prometheus/blackbox_exporter/blob/v0.28.0/CONFIGURATION.md)
- [Blackbox Exporter v0.28.0 TCP prober source](https://github.com/prometheus/blackbox_exporter/blob/v0.28.0/prober/tcp.go)
- [Blackbox Exporter v0.28.0 TLS metric source](https://github.com/prometheus/blackbox_exporter/blob/v0.28.0/prober/tls.go)
- [Blackbox Exporter v0.28.0 TCP TLS metric registration](https://github.com/prometheus/blackbox_exporter/blob/v0.28.0/prober/query_response.go)
- [Prometheus configuration reference](https://prometheus.io/docs/prometheus/latest/configuration/configuration/)
- [Prometheus multi-target exporter pattern](https://prometheus.io/docs/guides/multi-target-exporter/)
- [Go `crypto/x509.Certificate.VerifyHostname` documentation](https://pkg.go.dev/crypto/x509#Certificate.VerifyHostname)
- [Go `crypto/tls.Config` documentation](https://pkg.go.dev/crypto/tls#Config)

## Issues Found

- The introduction stated that a TLS client verifies exactly one reference identity. RFC 9525 permits a list of acceptable reference identifiers. The wording now explains that a client verifies the identity or acceptable identities for the connection, not every identity presented in the SAN extension.
- The OpenSSL fetch pipeline enabled `pipefail` but did not stop a larger script after a failed `s_client` verification; `s_client` can emit a leaf before returning a verification error. Added `|| exit 1` so a failed pipeline cannot silently continue to later checks.
- The hostname loop could skip a final entry when `expected-hosts.txt` lacked a terminating newline. Added the standard `read ... || [ -n "$hostname" ]` condition so every entry is processed.
- The post described `openssl x509 -checkhost` as if it enforced RFC 9525. In OpenSSL 4.0 and earlier supported releases, the compatibility matcher can use the subject Common Name when no DNS SAN exists and accepts partial-label wildcards such as `w*.example.com`, while RFC 9525 requires SAN-only identity matching and a single wildcard as the complete left-most label. The post now documents this version-scoped limitation, requires the structured SAN-policy check to succeed as well, detects partial or misplaced wildcard forms explicitly, and no longer calls the OpenSSL check standards-aware.
- The phrase "A-label DNS hostname" used A-label for an entire hostname. RFC 5890 defines an A-label as an individual internationalized label. The post now asks for ASCII hostnames with each internationalized label encoded as an A-label.
- The exact-set comparison stripped trailing dots from certificate SAN values. That could make a nonconforming issued value such as `api.example.com.` compare equal to the required `api.example.com`. Removed trailing-dot normalization from both sets and clarified that issuance inventory and certificate DNS SAN entries must omit the trailing root dot.
- One YAML document combined Blackbox Exporter's top-level `modules` configuration with Prometheus's top-level `scrape_configs`. Neither program accepts the other's top-level field in its configuration file. Split the example into `blackbox.yml` and `prometheus.yml` fragments without changing the module or scrape behavior.
- The Blackbox explanation said any missing SAN forces `probe_success` to `0`, which is false when another SAN, such as a wildcard, still covers the hostname. It now says failure occurs when no DNS SAN covers the probed hostname.
- The claim that one probe could not infer another hostname's certificate coverage overstated the limitation of `probe_ssl_last_chain_info`, whose `subjectalternative` label exposes the leaf's comma-separated DNS SANs. The post now distinguishes certificate inventory from actually exercising the other hostname's DNS and SNI deployment path.

## Review Notes

- The OpenSSL commands and shell control flow were syntax-checked and exercised with OpenSSL 3.6.2. The fetch pipeline successfully retrieved and parsed a publicly trusted leaf, and the loop processed an unterminated final hostname. Current OpenSSL 4.0.2 documentation and source were also checked for the compatibility-matching behavior described above.
- Deliberately generated CN-only, partial-wildcard, and trailing-dot test certificates confirmed the OpenSSL compatibility caveat and the corrected structured check's behavior.
- The Python snippet is syntactically valid and uses current, non-deprecated APIs verified with `cryptography` 49.0.0. Missing SAN extensions, DNS-name extraction, case normalization, set comparison, and wildcard count and placement checks behave as described.
- Both YAML fragments are syntactically valid and their fields match the current Prometheus and Blackbox Exporter v0.28.0 schemas. Blackbox Exporter derives TLS `ServerName` from each hostname target when `tls_config.server_name` is unset, so SNI and hostname verification use the intended name.
- `probe_ssl_last_chain_info` is available in current Blackbox Exporter releases but was introduced in v0.23.0. Its `subjectalternative` label contains DNS SANs, not every GeneralName type.
- A Blackbox hostname target selects one resolved address for a scrape. Covering every backend and address family, as the rollout section requires, needs separately controlled targets, modules, or probe locations.
- `s_client -showcerts` prints the certificate list sent by the server, not a separately verified chain. This is correct for extracting the first leaf here because `-verify_return_error` performs the chain and hostname verification for the connection.
