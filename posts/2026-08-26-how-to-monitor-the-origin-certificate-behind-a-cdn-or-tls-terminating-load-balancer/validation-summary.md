# Validation Summary: How to Monitor Origin Certificates Behind a CDN or Load Balancer

## Status

validated

## Post Type

Technical guide / tutorial

## Technologies Covered

- TLS and X.509 certificate validation
- Server Name Indication (SNI) and HTTP `Host` routing
- curl and OpenSSL `s_client`
- Prometheus Blackbox Exporter v0.28.0
- Prometheus scrape relabeling, PromQL, and alerting rules
- CDN-to-origin TLS, private PKI, and mutual TLS
- Cloudflare Full (strict), Origin CA, and Custom Origin Trust Store
- AWS Application Load Balancer listeners and HTTPS target groups

## Sources Consulted

- [OpenSSL `s_client` documentation](https://docs.openssl.org/master/man1/openssl-s_client/)
- [OpenSSL certificate-verification options](https://docs.openssl.org/master/man1/openssl-verification-options/)
- [curl command-line manual](https://curl.se/docs/manpage.html)
- [curl name-resolution behavior, including `--resolve`, SNI, and hostname verification](https://everything.curl.dev/usingcurl/connections/name.html)
- [RFC 6066: TLS Server Name Indication](https://www.rfc-editor.org/rfc/rfc6066)
- [RFC 5280: Internet X.509 PKI Certificate and CRL Profile](https://www.rfc-editor.org/rfc/rfc5280)
- [Blackbox Exporter v0.28.0 configuration schema](https://github.com/prometheus/blackbox_exporter/blob/v0.28.0/CONFIGURATION.md)
- [Blackbox Exporter v0.28.0 HTTP prober implementation](https://github.com/prometheus/blackbox_exporter/blob/v0.28.0/prober/http.go)
- [Blackbox Exporter v0.28.0 TLS metric helpers](https://github.com/prometheus/blackbox_exporter/blob/v0.28.0/prober/tls.go)
- [Blackbox Exporter v0.28.0 `probe_success` implementation](https://github.com/prometheus/blackbox_exporter/blob/v0.28.0/prober/handler.go)
- [Prometheus multi-target exporter pattern](https://prometheus.io/docs/guides/multi-target-exporter/)
- [Prometheus configuration and relabeling reference](https://prometheus.io/docs/prometheus/latest/configuration/configuration/)
- [Prometheus alerting-rule syntax](https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/)
- [PromQL functions](https://prometheus.io/docs/prometheus/latest/querying/functions/)
- [PromQL operators](https://prometheus.io/docs/prometheus/latest/querying/operators/)
- [Cloudflare Full (strict) SSL/TLS mode](https://developers.cloudflare.com/ssl/origin-configuration/ssl-modes/full-strict/)
- [Cloudflare Origin CA](https://developers.cloudflare.com/ssl/origin-configuration/origin-ca/)
- [Cloudflare Custom Origin Trust Store](https://developers.cloudflare.com/ssl/origin-configuration/custom-origin-trust-store/)
- [Cloudflare Authenticated Origin Pulls](https://developers.cloudflare.com/ssl/origin-configuration/authenticated-origin-pull/)
- [AWS Application Load Balancer listeners](https://docs.aws.amazon.com/elasticloadbalancing/latest/application/load-balancer-listeners.html)
- [AWS Application Load Balancer target groups](https://docs.aws.amazon.com/elasticloadbalancing/latest/application/load-balancer-target-groups.html)

## Issues Found

- The introduction stated that a second TLS session necessarily has a different certificate, trust policy, and hostname. It now states that these values can differ, which also allows for intentional certificate reuse.
- The introduction required every probe to reproduce the platform's backend verification policy. It now also permits a deliberately stricter, documented policy because some load balancers do not validate backend certificates.
- The curl example did not rule out proxy environment variables. Since an HTTPS proxy can prevent `--resolve` from pinning the actual socket destination, `--noproxy '*'` was added to guarantee the intended direct connection.
- The OpenSSL warning incorrectly treated `-verify 0` as disabled verification. Current `s_client` requires a positive verification-depth argument, rejects zero, and normally continues after certificate errors unless `-verify_return_error` is used. The warning now describes those semantics and retains the requirement for chain and hostname verification.
- The mTLS guidance described `cert_file` and `key_file` as module fields. It now identifies their correct location under `http.tls_config`.
- `probe_success` was described and alerted on as a TLS-only result even though it represents the entire HTTP probe, including the configured HTTP 200 status check. Its description now identifies it as the overall probe result, and the alert was renamed to `OriginHTTPSProbeFailed` with an HTTPS-probe summary.
- The Cloudflare Full (strict) description omitted Custom Origin Trust Store. It now distinguishes Cloudflare's default public/Origin CA trust from an optional zone-specific custom CA trust store.
- The load-balancer discussion did not account for platforms that skip backend certificate validation. It now notes that AWS Application Load Balancer accepts expired or self-signed HTTPS target certificates, making the verified monitoring probe intentionally stricter than the ALB itself.
- Official documentation links for curl `--noproxy`, Cloudflare Custom Origin Trust Store, and AWS ALB target groups were added to support the corrected behavior and provider-specific claims.

## Review Notes

- The Blackbox Exporter configuration, scrape relabeling, metric names, metric semantics, PromQL expression, and alert-rule structure were verified against v0.28.0, the latest stable release available on the validation date.
- `probe_ssl_earliest_cert_expiry` reports the earliest expiry among peer-presented certificates. A root certificate that the peer does not present is therefore outside this metric's scope; the post accurately calls this the presented-chain expiry.
- OpenSSL `-showcerts` displays the certificate list sent by the server rather than a reconstructed verified chain. The post describes the output only as certificate details, so no correction was needed.
- Cloudflare Custom Origin Trust Store requires Advanced Certificate Manager on the zone.
- All external links in the post resolved to the intended official or authoritative documentation during review.
