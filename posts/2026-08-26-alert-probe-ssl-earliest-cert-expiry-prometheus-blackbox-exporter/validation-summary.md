# Validation Summary: How to Alert on probe_ssl_earliest_cert_expiry with Prometheus Blackbox Exporter

## Status
validated

## Post Type
Technical tutorial and configuration guide

## Technologies Covered

- Prometheus scrape configuration, recording rules, and alerting rules
- PromQL
- Prometheus Blackbox Exporter TCP/TLS probes
- TLS, SNI, and X.509 certificate-chain verification
- Alertmanager routing and inhibition
- `curl`, `sed`, OpenSSL `s_client`, and `promtool`

## Sources Consulted

- [Prometheus download page and current component releases](https://prometheus.io/download/)
- [Blackbox Exporter v0.28.0 release](https://github.com/prometheus/blackbox_exporter/releases/tag/v0.28.0)
- [Blackbox Exporter v0.28.0 configuration reference](https://github.com/prometheus/blackbox_exporter/blob/v0.28.0/CONFIGURATION.md)
- [Blackbox Exporter TLS metric declarations](https://github.com/prometheus/blackbox_exporter/blob/v0.28.0/prober/prober.go)
- [Blackbox Exporter earliest-expiry and verified-chain calculations](https://github.com/prometheus/blackbox_exporter/blob/v0.28.0/prober/tls.go)
- [Blackbox Exporter TCP target resolution, ServerName, and TLS dialing](https://github.com/prometheus/blackbox_exporter/blob/v0.28.0/prober/tcp.go)
- [Blackbox Exporter TCP TLS metric registration](https://github.com/prometheus/blackbox_exporter/blob/v0.28.0/prober/query_response.go)
- [Blackbox Exporter probe handler and `probe_success`](https://github.com/prometheus/blackbox_exporter/blob/v0.28.0/prober/handler.go)
- [Go `crypto/tls` documentation for `Config` and `ConnectionState`](https://pkg.go.dev/crypto/tls)
- [Go `crypto/x509.Certificate.Verify` documentation](https://pkg.go.dev/crypto/x509#Certificate.Verify)
- [RFC 8446 Section 4.4.2: TLS Certificate](https://www.rfc-editor.org/rfc/rfc8446.html#section-4.4.2)
- [RFC 6066 Section 3: Server Name Indication](https://www.rfc-editor.org/rfc/rfc6066.html#section-3)
- [Prometheus configuration reference](https://prometheus.io/docs/prometheus/latest/configuration/configuration/)
- [Prometheus multi-target exporter guide](https://prometheus.io/docs/guides/multi-target-exporter/)
- [Prometheus recording rules](https://prometheus.io/docs/prometheus/latest/configuration/recording_rules/)
- [Prometheus alerting rules](https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/)
- [Prometheus query functions](https://prometheus.io/docs/prometheus/latest/querying/functions/)
- [Prometheus query operators](https://prometheus.io/docs/prometheus/latest/querying/operators/)
- [Prometheus template reference](https://prometheus.io/docs/prometheus/latest/configuration/template_reference/)
- [Prometheus jobs, instances, and the `up` metric](https://prometheus.io/docs/concepts/jobs_instances/)
- [Prometheus staleness behavior](https://prometheus.io/docs/prometheus/latest/querying/basics/#staleness)
- [Prometheus `promtool` command reference](https://prometheus.io/docs/prometheus/latest/command-line/promtool/)
- [curl command-line reference](https://curl.se/docs/manpage.html)
- [POSIX `sed` specification](https://pubs.opengroup.org/onlinepubs/9799919799.2024edition/utilities/sed.html)
- [GNU `sed` basic regular-expression syntax](https://www.gnu.org/software/sed/manual/html_node/BRE-syntax.html)
- [OpenSSL `s_client` documentation](https://docs.openssl.org/master/man1/openssl-s_client/)

## Issues Found

- The recording rule selected `probe_ssl_earliest_cert_expiry` from every job, while the probe-failure and scrape-failure alerts were limited to `job="blackbox-tls-certificate"`. This could bring unrelated or non-strict Blackbox modules into the expiry alerts without the matching failure coverage. Added the same job selector to the recording-rule input.
- The probe-inspection command used `\|`, a GNU `sed` basic-regular-expression extension that produced no matches with BSD/macOS `sed`. Replaced the alternation with two portable `-e` expressions.
- The explanation said that `for` filters brief rollout changes without accounting for evaluation and scrape cadence. Clarified that `for` delays firing, filters only conditions that clear before its duration, and must be chosen with the scrape interval in mind.
- The omitted-intermediate claim implied that strict verification should always fail. Qualified it to state that `probe_success` becomes `0` only when the verifier cannot build another trusted path.
- `openssl s_client -showcerts` did not identify the endpoint or SNI name and would default to a local connection. It also displays the peer-sent certificate list, not a verified chain. Added `-connect`, `-servername`, and noninteractive input, described the output as the served list, and noted that the exporter's trust store must also be inspected when the metrics differ.
- `promtool check rules` had no rule-file argument and therefore reads standard input. Added the example rule filename `tls-certificate-rules.yml` so the command checks the file described by the text.

## Review Notes

- Blackbox Exporter v0.28.0 is the latest tagged release as of 2026-08-27. Prometheus v3.14.0 is the latest Prometheus release as of that date.
- The corrected Blackbox module passed `blackbox_exporter v0.28.0 --config.check`. The scrape configuration passed `promtool v3.14.0 check config`, and the combined recording and alerting configuration passed `promtool v3.14.0 check rules` with five rules found.
- The core metric explanation is correct: `probe_ssl_earliest_cert_expiry` is the minimum nonzero `NotAfter` across the peer-sent certificates. `probe_ssl_last_chain_expiry_timestamp_seconds` instead chooses the latest of the per-verified-chain earliest expiries, so the two metrics are not interchangeable.
- `insecure_skip_verify: false` and `min_version: TLS12` match the current defaults, but keeping them explicit is valid for a strict, auditable probe module.
- With the example's five-minute scrape interval, a critical `for: 5m` may still fire on one anomalous scrape depending on scrape and rule-evaluation timing. The configuration is valid, and the revised prose now tells readers to choose `for` with the scrape interval in mind.
- All links in the post's Official Documentation section resolved to the described upstream resources. The GitHub links follow the moving `master` branch; pinning them to a release tag would improve reproducibility but is not required for correctness.
