# Validation Summary: How to Configure Prometheus Blackbox Exporter for IPv6 Probing

## Status
validated

## Post Type
Guide

## Technologies Covered
- Prometheus
- Prometheus Blackbox Exporter
- IPv6
- PromQL
- YAML configuration

## Sources Consulted
- Prometheus Blackbox Exporter README: https://github.com/prometheus/blackbox_exporter
- Prometheus Blackbox Exporter configuration reference: https://github.com/prometheus/blackbox_exporter/blob/master/CONFIGURATION.md
- Prometheus Blackbox Exporter example configuration: https://github.com/prometheus/blackbox_exporter/blob/master/example.yml
- Prometheus guide on the multi-target exporter pattern: https://prometheus.io/docs/guides/multi-target-exporter/
- Prometheus configuration reference: https://prometheus.io/docs/operating/configuration/
- Prometheus Blackbox Exporter releases page: https://github.com/prometheus/blackbox_exporter/releases
- Prometheus Blackbox Exporter source for DNS probe behavior: https://github.com/prometheus/blackbox_exporter/blob/master/prober/dns.go
- Prometheus Blackbox Exporter source for `probe_ip_protocol`: https://github.com/prometheus/blackbox_exporter/blob/master/prober/utils.go
- Prometheus Blackbox Exporter source for `probe_ssl_earliest_cert_expiry`: https://github.com/prometheus/blackbox_exporter/blob/master/prober/prober.go

## Issues Found
- The install command used a wildcard in the GitHub release URL, which would not download a real release asset. I replaced it with a valid release URL for `v0.28.0`, the latest upstream release as of 2026-04-24.
- The install step moved `blackbox_exporter` from the wrong path after extraction. I corrected it to install the binary from the extracted release directory and added `mkdir -p /etc/blackbox_exporter` because the later start command references that path.
- The startup comment implied the exporter could be started before the config file existed. I clarified that the command should be run after creating the config file in Step 2.
- The article omitted the Linux privilege requirement for ICMP probing. I added a note that ICMP probes require `CAP_NET_RAW`, an allowed `net.ipv4.ping_group_range`, or root, matching upstream documentation.
- The description of `ip_protocol_fallback: true` implied fallback occurs after an IPv6 connection failure. Upstream documentation describes address-family selection, not happy-eyeballs style retry. I corrected the wording to say IPv4 can be used when no IPv6 address is available.
- The DNS example was not valid as written. `query_name` is a required static field in the module config, not a `{{ target }}` template, and the DNS probe target is the resolver being queried. I replaced the template with a valid example domain and clarified the resolver/queried-name distinction.
- The DNS validation rule used `fail_if_not_matches_regexp`, which is stricter than the stated goal of checking that a domain has AAAA records. I changed it to `fail_if_none_matches_regexp` so the probe succeeds when at least one AAAA answer is returned.
- The metric note for `probe_ip_protocol` referred to `ip_proto=6`, which is inaccurate. I corrected the explanation to note that the metric value `6` indicates IPv6.

## Review Notes
- The article is technically correct after the fixes above.
- The install example now pins `0.28.0`, which was the latest Prometheus Blackbox Exporter release on 2026-04-24. That version reference should be revisited if the post is updated later.
