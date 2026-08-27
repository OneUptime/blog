# Validation Summary: Why Your SSL Monitor Sees the Wrong Certificate: Send the Correct SNI Hostname

## Status
validated

## Post Type
Technical guide

## Technologies Covered

- TLS and HTTPS
- Server Name Indication (SNI)
- X.509 certificates and Subject Alternative Name (SAN) verification
- OpenSSL `s_client` and `x509`
- curl
- Prometheus
- Prometheus Blackbox Exporter
- DNS, virtual hosts, and load balancers

## Sources Consulted

- [RFC 6066, Section 3: Server Name Indication](https://www.rfc-editor.org/rfc/rfc6066.html#section-3)
- [RFC 9525: Service Identity in TLS](https://www.rfc-editor.org/rfc/rfc9525.html)
- [OpenSSL 3.6 `s_client` documentation](https://docs.openssl.org/3.6/man1/openssl-s_client/)
- [OpenSSL 3.6 `x509` documentation](https://docs.openssl.org/3.6/man1/openssl-x509/)
- [OpenSSL 3.6 certificate verification options](https://docs.openssl.org/3.6/man1/openssl-verification-options/)
- [OpenSSL hostname verification flags](https://docs.openssl.org/master/man3/X509_VERIFY_PARAM_set_hostflags/)
- [curl command-line documentation](https://curl.se/docs/manpage.html)
- [Prometheus multi-target exporter guide](https://prometheus.io/docs/guides/multi-target-exporter/)
- [Blackbox Exporter v0.28.0 configuration reference](https://github.com/prometheus/blackbox_exporter/blob/v0.28.0/CONFIGURATION.md)
- [Blackbox Exporter v0.28.0 HTTP prober source](https://github.com/prometheus/blackbox_exporter/blob/v0.28.0/prober/http.go)
- [Go `crypto/tls.Config` documentation](https://pkg.go.dev/crypto/tls#Config)

## Issues Found

- The verified OpenSSL example piped `s_client` directly to `x509`, discarded `s_client` diagnostics, and therefore allowed the final `x509` process to determine a successful pipeline status even when chain or hostname verification failed. The command now captures `s_client` output and runs `x509` only after `s_client` succeeds, preserving verification errors and the correct failure status.
- The explanation could imply that OpenSSL's `-verify_hostname` enforces the current SAN-only service-identity rule. OpenSSL can fall back to the subject Common Name when a DNS SAN is absent, so the post now tells readers to inspect the displayed SAN as well.
- The SNI description was categorical and blurred the independently configured SNI and verification names. The text now reflects that SNI is optional, can guide certificate selection, and is distinct from matching the verification name against certificate SANs.
- The curl backend-pinning example did not account for environment-configured proxies, which can prevent `--resolve` from selecting the actual network peer. It now uses `--noproxy '*'` so the example makes the direct, pinned connection it describes.
- The post referred to replacing the probe target with the Blackbox Exporter's IP, when the relevant substitution is the endpoint's resolved IP. The wording now identifies the correct address.

## Review Notes

- Both Blackbox Exporter module snippets passed the official v0.28.0 `--config.check` validation. The documented `server_name`, `headers`, `follow_redirects`, `fail_if_not_ssl`, `valid_status_codes`, and `insecure_skip_verify` fields are current.
- Blackbox Exporter v0.28.0 derives the TLS server name from a hostname target and uses an explicit `tls_config.server_name` for both SNI and hostname verification. It registers certificate-expiry metrics only when an HTTP response includes TLS connection state; a certificate-verification failure normally yields no such response, so alerting on `probe_success == 0` is necessary.
- `curl --fail` on the Blackbox Exporter's `/probe` endpoint checks the endpoint's HTTP status, not the value of the returned `probe_success` metric. The post does not claim otherwise, but automation consuming this command should parse the metric.
- The term HTTP `Host` is exact for HTTP/1.1; HTTP/2 and HTTP/3 use the `:authority` pseudo-header. Blackbox Exporter's `headers: Host` configuration remains correct because its HTTP client maps that value to the request authority.
- The example domain and IP address are appropriate reserved documentation values. The GitHub `master` documentation links are valid but mutable; the review also checked the v0.28.0 release-tagged sources.
