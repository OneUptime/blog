# Validation Summary: How to Monitor DNS Resolution Latency and Failures

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector Prometheus receiver
- Prometheus scrape configuration and PromQL
- Prometheus Blackbox Exporter DNS probes
- DNS A and AAAA lookups
- `dig`, shell, and `awk`

## Sources Consulted
- OpenTelemetry Collector Contrib Prometheus receiver README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/prometheusreceiver/README.md
- OpenTelemetry Collector Contrib repository tree, confirming no upstream `dnscheck` receiver exists: https://github.com/open-telemetry/opentelemetry-collector-contrib
- Prometheus Blackbox Exporter README: https://github.com/prometheus/blackbox_exporter
- Prometheus Blackbox Exporter configuration reference: https://github.com/prometheus/blackbox_exporter/blob/master/CONFIGURATION.md
- Prometheus Blackbox Exporter DNS prober source for emitted metric names: https://github.com/prometheus/blackbox_exporter/blob/master/prober/dns.go
- Prometheus configuration reference for `scrape_configs`, `metrics_path`, `static_configs`, and `relabel_configs`: https://prometheus.io/docs/prometheus/latest/configuration/configuration/

## Issues Found
- The post described a `dnscheck` OpenTelemetry Collector receiver with `targets`, `query_type`, `collection_interval`, and `dns_server_address` fields. No such receiver exists in the current upstream OpenTelemetry Collector Contrib repository. I replaced the examples with a documented implementation using Prometheus Blackbox Exporter DNS modules scraped by the Collector `prometheus` receiver.
- The original examples used nonexistent metrics such as `dnscheck_error_total` and `dnscheck_duration_ms`. I updated the alert and dashboard queries to use Blackbox Exporter DNS metrics: `probe_success` and `probe_dns_duration_seconds{phase="request"}`.
- The original latency threshold used milliseconds, but Blackbox Exporter duration metrics are emitted in seconds. I changed `100` milliseconds to `0.1` seconds and updated the annotation text.
- The post claimed an empty `dns_server_address` would use the system resolver. Since the corrected Blackbox Exporter DNS prober targets a DNS server address, I changed the guidance to explicitly configure the resolver address used by applications.
- The TTL section referred to the nonexistent `dnscheck` receiver. I changed it to note that Blackbox Exporter DNS probes do not emit TTL metrics.
- The application latency panel comment said it showed connection establishment time from traces, but the PromQL example is an HTTP client duration metric query. I corrected the comment to describe the metric accurately.

## Review Notes
The corrected approach requires a running Blackbox Exporter reachable from the Collector at the configured `blackbox-exporter:9115` address. In real deployments, adjust the DNS resolver targets and exporter address to match the environment.
