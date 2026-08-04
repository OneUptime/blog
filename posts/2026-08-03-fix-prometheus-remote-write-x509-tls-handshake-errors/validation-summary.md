# Validation Summary: Fixing x509 and TLS Handshake Errors in Prometheus Remote Write

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Prometheus
- Prometheus Remote Write
- TLS and X.509 certificate validation
- Mutual TLS (mTLS)
- OpenSSL
- curl
- YAML configuration
- PromQL

## Sources Consulted
- [Prometheus configuration reference: `remote_write` and `tls_config`](https://prometheus.io/docs/prometheus/latest/configuration/configuration/)
- [Prometheus remote storage documentation](https://prometheus.io/docs/prometheus/latest/storage/)
- [Prometheus Remote Write tuning and WAL behavior](https://prometheus.io/docs/practices/remote_write/)
- [Prometheus Remote Write 1.0 specification](https://prometheus.io/docs/specs/prw/remote_write_spec/)
- [Prometheus HTTPS and authentication configuration](https://prometheus.io/docs/prometheus/latest/configuration/https/)
- [Prometheus exporter-toolkit web TLS configuration](https://github.com/prometheus/exporter-toolkit/blob/master/docs/web-configuration.md)
- [Prometheus Remote Write queue metrics source](https://github.com/prometheus/prometheus/blob/main/storage/remote/queue_manager.go)
- [Prometheus Remote Write HTTP client and retry source](https://github.com/prometheus/prometheus/blob/main/storage/remote/client.go)
- [Prometheus `promtool check config` source](https://github.com/prometheus/prometheus/blob/main/cmd/promtool/main.go)
- [Go `crypto/tls.Config` documentation](https://pkg.go.dev/crypto/tls#Config)
- [Go `crypto/x509.Certificate.VerifyHostname` documentation](https://pkg.go.dev/crypto/x509#Certificate.VerifyHostname)
- [OpenSSL `s_client` documentation](https://docs.openssl.org/3.4/man1/openssl-s_client/)
- [OpenSSL `x509` documentation](https://docs.openssl.org/3.4/man1/openssl-x509/)
- [OpenSSL `pkey` documentation](https://docs.openssl.org/3.4/man1/openssl-pkey/)
- [OpenSSL digest command documentation](https://docs.openssl.org/3.4/man1/openssl-dgst/)
- [curl command-line documentation](https://curl.se/docs/manpage.html)

## Issues Found
- The initial `openssl s_client` command sent SNI but did not perform hostname verification. Added `-verify_hostname metrics.example.net` so the probe checks the certificate identity as well as its chain.
- The SNI explanation implied that omitting `-servername` always prevents SNI. Updated it to reflect that OpenSSL 1.1.1 and newer derive SNI from a DNS-form `-connect` host by default, while retaining the explicit flag for unambiguous routing and address overrides.
- The hostname-verification explanation mentioned only DNS SANs. Updated it to distinguish DNS SAN matching from IP Address SAN matching, note that Go ignores the legacy Common Name, and clarify that a DNS-valued `server_name` is used for SNI.
- The recovery section said to validate and reload the configuration immediately before showing only `promtool check config`. Changed the wording to make clear that `promtool` validates the file before a separate reload.
- The official HTTPS and authentication link pointed to the basic-auth tutorial. Replaced it with Prometheus's dedicated HTTPS and authentication configuration reference.

## Review Notes
The remaining YAML fields, TLS version names and defaults, mTLS file roles, OpenSSL and curl commands, Remote Write retry/WAL explanation, metric names, `remote_name` label selectors, and PromQL expressions match the current official documentation and Prometheus source. The `/-/ready` path remains intentionally receiver-specific, as the post already notes.
