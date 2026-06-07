# Validation Summary: How to Implement Prometheus Blackbox Exporter

## Status
validated

## Post Type
Tutorial / Implementation Guide

## Technologies Covered
- Prometheus Blackbox Exporter (v0.25.0)
- Prometheus (scrape configuration, relabeling, alerting rules, PromQL)
- Docker / Docker Compose
- systemd (service unit configuration)
- HTTP / HTTPS probing (incl. TLS, mTLS, basic auth, bearer tokens)
- TCP probing (incl. SMTP banner, Redis PING, MySQL handshake)
- DNS probing (A, MX, DNS-over-TLS)
- ICMP probing (incl. payload size / don't-fragment, IPv6)
- Grafana (dashboard PromQL queries)
- Mermaid diagrams

## Sources Consulted
- Blackbox Exporter CONFIGURATION.md (master branch): https://github.com/prometheus/blackbox_exporter/blob/master/CONFIGURATION.md
- Blackbox Exporter HTTP prober source: https://github.com/prometheus/blackbox_exporter/blob/master/prober/http.go
- Blackbox Exporter ICMP prober source: https://github.com/prometheus/blackbox_exporter/blob/master/prober/icmp.go
- Blackbox Exporter releases page (to confirm v0.25.0 is a valid release): https://github.com/prometheus/blackbox_exporter/releases
- Prometheus configuration docs (scrape_configs, relabel_configs): https://prometheus.io/docs/prometheus/latest/configuration/configuration/

## Issues Found
1. **Inaccurate inline comment for `follow_redirects`** (basic configuration example): The comment read "Follow redirects up to this many times" which implied the option takes an integer count. `follow_redirects` is a boolean. Changed the comment to "Whether to follow HTTP redirects".
2. **Inaccurate inline comment for `fail_if_ssl`** (basic configuration example): The comment read "Fail if SSL certificate is invalid". Per the upstream docs, `fail_if_ssl` causes the probe to fail when the connection used SSL/TLS (it is an enforcement flag for *non-SSL* endpoints, not a certificate-validity check). Replaced the comment with "Fail if the probe connection used SSL/TLS" and added a matching comment for the adjacent `fail_if_not_ssl: false` line.
3. **Inaccurate description for `probe_http_version` metric** (Key Metrics table): The post stated "1 for HTTP/1.1, 2 for HTTP/2". The exporter parses the response's `Proto` string into a float (`strconv.ParseFloat`), so HTTP/1.1 is reported as `1.1` and HTTP/2.0 as `2.0`. Updated the table cell to "HTTP version (e.g., 1.1 for HTTP/1.1, 2.0 for HTTP/2)".

## Review Notes
- Spot-checked the remaining metric names against the prober source: `probe_success`, `probe_duration_seconds`, `probe_dns_lookup_time_seconds`, `probe_http_status_code`, `probe_http_content_length`, `probe_http_redirects`, `probe_http_ssl`, `probe_http_duration_seconds`, `probe_ssl_earliest_cert_expiry`, `probe_ssl_last_chain_info`, `probe_tls_version_info`, `probe_dns_answer_rrs`, `probe_dns_authority_rrs`, `probe_dns_additional_rrs`, `probe_icmp_duration_seconds`, and `probe_icmp_reply_hop_limit` all match the metrics registered by the exporter.
- The TCP `query_response` examples (SMTP banner, Redis PING, MySQL handshake) use the documented step-list pattern (alternating `expect` / `send` entries), which is supported by the upstream YAML schema.
- The Prometheus relabel pattern (`__address__` → `__param_target` → `instance`, then overriding `__address__` to point at the exporter) matches the canonical pattern in the Blackbox Exporter README.
- `version: '3.8'` in the Docker Compose file is technically obsolete in newer Compose specs (the `version` key is now ignored), but it is still accepted and harmless — not a correctness issue.
- The binary version `v0.25.0` referenced in the install snippet is a real release; a newer release (0.26.0) exists at time of review but the steps work identically.
- The ICMP `dont_fragment` + `payload_size` example is valid per the current CONFIGURATION.md schema; both options have been supported since 0.20.x.
- Alerting rules and PromQL queries are syntactically valid and reference real metrics.
