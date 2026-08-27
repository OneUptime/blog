# Validation Summary: Why Internal and External SSL Monitors Disagree

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered

- TLS/SSL certificate monitoring and X.509 certificate validation
- Split-horizon DNS, BIND `dig`, IPv4, and IPv6
- curl `--resolve` and proxy bypass controls
- OpenSSL `s_client`, SNI, and hostname verification
- Enterprise TLS inspection, CDNs, and load balancers
- Prometheus and blackbox exporter HTTP probes
- Prometheus scrape configuration and relabeling
- Trust stores, certificate chains, and clock-dependent validity checks

## Sources Consulted

- [BIND 9 `dig` manual](https://bind9.readthedocs.io/en/latest/manpages.html#dig-dns-lookup-utility)
- [curl command-line manual: `--resolve` and `--noproxy`](https://curl.se/docs/manpage.html)
- [everything curl: Name resolve tricks](https://everything.curl.dev/usingcurl/connections/name.html)
- [OpenSSL `s_client` documentation](https://docs.openssl.org/master/man1/openssl-s_client/)
- [OpenSSL certificate verification options](https://docs.openssl.org/master/man1/openssl-verification-options/)
- [RFC 6066: TLS Server Name Indication](https://www.rfc-editor.org/rfc/rfc6066.html)
- [RFC 9113 Section 8.3.1: HTTP/2 request pseudo-header fields](https://www.rfc-editor.org/rfc/rfc9113.html#section-8.3.1)
- [RFC 9114 Section 4.3.1: HTTP/3 request pseudo-header fields](https://www.rfc-editor.org/rfc/rfc9114.html#section-4.3.1)
- [RFC 5280: Internet X.509 PKI certificate and CRL profile](https://www.rfc-editor.org/rfc/rfc5280.html)
- [RFC 9499: DNS terminology](https://www.rfc-editor.org/rfc/rfc9499.html)
- [RFC 9704: Split-horizon DNS deployment considerations](https://www.rfc-editor.org/rfc/rfc9704.html)
- [Prometheus blackbox exporter v0.28.0 configuration](https://github.com/prometheus/blackbox_exporter/blob/v0.28.0/CONFIGURATION.md)
- [Prometheus blackbox exporter v0.28.0 stock modules](https://github.com/prometheus/blackbox_exporter/blob/v0.28.0/blackbox.yml)
- [Prometheus blackbox exporter v0.28.0 HTTP probe implementation](https://github.com/prometheus/blackbox_exporter/blob/v0.28.0/prober/http.go)
- [Prometheus configuration reference](https://prometheus.io/docs/prometheus/latest/configuration/configuration/)
- [Prometheus multi-target exporter pattern](https://prometheus.io/docs/guides/multi-target-exporter/)
- [Cloudflare Full (strict) origin TLS](https://developers.cloudflare.com/ssl/origin-configuration/ssl-modes/full-strict/)
- [AWS Application Load Balancer certificate selection](https://docs.aws.amazon.com/elasticloadbalancing/latest/application/https-listener-certificates.html)
- [AWS Network Firewall TLS inspection certificate requirements](https://docs.aws.amazon.com/network-firewall/latest/developerguide/tls-inspection-certificate-requirements.html)

## Issues Found

- The address-pinning instructions implied that `curl --resolve` always selects the origin address. With an HTTP or HTTPS proxy, the proxy selects the upstream address instead. Added `--noproxy '*'` to the direct-connection examples and explained that it should be removed when deliberately reproducing the proxy path.
- The IPv6 `--resolve` argument was unquoted. Although the curl syntax was correct, default zsh treats the square brackets as a filename-generation pattern and rejects the command before curl runs. Quoted the complete argument so the example works in zsh as well as Bash.
- The post described the preserved HTTP name only as the `Host` header. HTTP/2 and HTTP/3 normally carry that value in the `:authority` pseudo-header. Updated the observation checklist and curl explanation to use the protocol-neutral term “HTTP authority.”
- The redirect explanation did not state what happens when the final response is plain HTTP. Clarified that blackbox exporter's HTTP prober derives TLS metrics from the final response's TLS connection and emits no TLS metrics when the final response is not TLS.
- The Prometheus scrape configuration referenced `https_certificate`, which is not a built-in blackbox exporter module. Added the required custom `blackbox.yml` module definition with `follow_redirects: false`, so the scrape jobs no longer depend on an unstated configuration.

## Review Notes

- The `dig` commands, curl IPv4 and bracketed-IPv6 `--resolve` forms, OpenSSL options, and Prometheus relabeling sequence are current and valid.
- The added `https_certificate` module passed blackbox exporter v0.28.0's native `--config.check` validation.
- With `follow_redirects: false`, blackbox exporter still emits TLS metrics for the initial HTTPS response. An initial 3xx response does not set `probe_success` to 1 under the default 2xx status policy unless its exact status is added to `valid_status_codes`.
- Blackbox exporter does not use proxy environment variables unless `proxy_from_environment` is enabled in its HTTP probe configuration; explicit proxy configuration can also affect the path.
- All external documentation links in the post resolved to the intended official resources at review time.
