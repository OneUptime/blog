# Validation Summary: How to Detect Different TLS Certificates Served over IPv4 and IPv6

## Status

validated

## Post Type

Technical guide / monitoring tutorial

## Technologies Covered

- Dual-stack IPv4 and IPv6 networking
- DNS A and AAAA records, BIND `dig`, and split DNS
- curl address-family selection and `--resolve`
- TLS, SNI, X.509 certificates, and OpenSSL
- Prometheus blackbox exporter
- Prometheus scrape configuration, PromQL, and alerting rules

## Sources Consulted

- [RFC 3596: DNS Extensions to Support IP Version 6](https://datatracker.ietf.org/doc/html/rfc3596)
- [RFC 6066: TLS Extension Definitions, including SNI](https://datatracker.ietf.org/doc/html/rfc6066)
- [BIND 9 `dig` manual](https://bind9.readthedocs.io/en/latest/manpages.html#dig-dns-lookup-utility)
- [Cloudflare 1.1.1.1 resolver addresses](https://developers.cloudflare.com/1.1.1.1/ip-addresses/)
- [curl command-line manual](https://curl.se/docs/manpage.html), [IPv6 tutorial](https://curl.se/docs/tutorial.html#ipv6), and [certificate verification guide](https://curl.se/docs/sslcerts.html)
- [OpenSSL `s_client` manual](https://docs.openssl.org/master/man1/openssl-s_client/), [`x509` manual](https://docs.openssl.org/master/man1/openssl-x509/), and [verification options](https://docs.openssl.org/master/man1/openssl-verification-options/)
- [zsh filename-generation rules](https://zsh.sourceforge.io/Doc/Release/Expansion.html#Filename-Generation)
- [blackbox_exporter v0.28.0 configuration reference](https://github.com/prometheus/blackbox_exporter/blob/v0.28.0/CONFIGURATION.md), [Prometheus configuration example](https://github.com/prometheus/blackbox_exporter/blob/v0.28.0/README.md#prometheus-configuration), and [v0.28.0 release](https://github.com/prometheus/blackbox_exporter/releases/tag/v0.28.0)
- blackbox_exporter v0.28.0 source for [IP selection and address hashing](https://github.com/prometheus/blackbox_exporter/blob/v0.28.0/prober/utils.go), [HTTP TLS metric emission](https://github.com/prometheus/blackbox_exporter/blob/v0.28.0/prober/http.go), and [leaf-certificate helpers](https://github.com/prometheus/blackbox_exporter/blob/v0.28.0/prober/tls.go)
- [Prometheus multi-target exporter guide](https://prometheus.io/docs/guides/multi-target-exporter/), [PromQL functions](https://prometheus.io/docs/prometheus/latest/querying/functions/), [PromQL operators](https://prometheus.io/docs/prometheus/latest/querying/operators/), and [alerting rules](https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/)

## Issues Found

- The IPv6 curl `--resolve` value was unquoted. Its square brackets are treated as a filename-generation pattern by zsh, whose default `NOMATCH` behavior can reject the command before curl runs. Quoted the complete `host:port:[address]` argument so curl receives the required bracketed IPv6 literal unchanged.
- The text treated `curl --ipv6` as unconditional proof of an IPv6 service path. curl documents that some resolvers, notably macOS, can return IPv4-mapped IPv6 addresses for an IPv6-only lookup. Added a requirement to inspect the connected address in verbose output before drawing that conclusion.
- The OpenSSL pipelines did not print SANs despite recommending that they be captured, and `-verify_return_error` could abort before an invalid leaf reached the downstream `x509` command. Added `-showcerts`, `-verify_quiet`, and `-ext subjectAltName`, exposed verification errors, and enabled `pipefail`. The commands now show the presented leaf metadata even for an expired or hostname-invalid certificate while preserving a nonzero verification status.
- The fallback explanation implied that blackbox_exporter retries another family after a connection or TLS failure. Its fallback controls address selection only: the exporter makes one connection attempt and uses the non-preferred family when no preferred-family address is available. Corrected the introduction, module explanation, and false-conclusion bullet to reflect that behavior.
- The `probe_ip_protocol` explanation omitted its resolution-failure state. Clarified that it becomes `4` or `6` only after successful family-specific address selection and remains `0` when that resolution fails.
- The post said that joining against a multi-value approved fingerprint set enforces cross-family equality. Approved-set membership and literal equality are different policies. Changed the text to compare current fingerprints for equality and use approved-set membership when multiple certificates are intentionally valid.
- The final section called the configured HTTP probes “DNS probes” and mentioned preserving only SNI when pinning an IP. Renamed them hostname-based HTTPS probes and clarified that pinned targets must preserve both the HTTP `Host` header and TLS SNI, such as through blackbox_exporter's `hostname` probe parameter.

## Review Notes

- The blackbox exporter module passed `blackbox_exporter` v0.28.0's `--config.check`. The scrape configuration, alert rules, expiry expression, and certificate-transition query passed `promtool` v3.13.2 checks.
- The certificate-transition query is correct for the shown one-target-per-family topology. Deployments with multiple monitoring locations or duplicate scrape jobs should include those distinguishing labels in the aggregation to avoid conflating separate probes.
- In blackbox_exporter v0.28.0, the `subjectalternative` label is built from DNS SAN names; it does not represent IP, email, or URI SAN forms.
- An operational ruleset may also alert on `up == 0`, because `probe_success` is absent when Prometheus cannot scrape the blackbox exporter itself.
