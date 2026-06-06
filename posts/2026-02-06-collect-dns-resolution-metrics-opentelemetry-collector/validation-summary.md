# Validation Summary: How to Collect DNS Resolution Metrics with the OpenTelemetry Collector

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector HTTP Check receiver
- OpenTelemetry Collector Prometheus receiver
- OpenTelemetry Collector OTLP exporter
- CoreDNS
- BIND / named
- Prometheus metrics and relabeling
- Kubernetes service discovery

## Sources Consulted
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector receivers list: https://opentelemetry.io/docs/collector/components/receiver/
- OpenTelemetry Collector HTTP Check receiver README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/httpcheckreceiver/README.md
- OpenTelemetry Collector HTTP Check receiver generated metrics documentation: https://raw.githubusercontent.com/open-telemetry/opentelemetry-collector-contrib/main/receiver/httpcheckreceiver/documentation.md
- OpenTelemetry Collector Prometheus receiver README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/prometheusreceiver/README.md
- OpenTelemetry OTLP exporter specification: https://opentelemetry.io/docs/specs/otel/protocol/exporter/
- CoreDNS Prometheus plugin documentation: https://coredns.io/plugins/metrics/
- CoreDNS cache plugin documentation: https://coredns.io/plugins/cache/
- CoreDNS forward plugin documentation: https://coredns.io/plugins/forward/
- Prometheus configuration and relabeling documentation: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Prometheus BIND exporter README: https://github.com/prometheus-community/bind_exporter

## Issues Found
- The post used the deprecated `httpcheck` component name and said DNS timing was only implicit. Updated the examples and prose to use the current `http_check` receiver name and to enable `httpcheck.dns.lookup.duration`.
- Removed references to a non-existent `network` receiver DNS check, a `script` processor approach, and DNS-aware `health_check` behavior. Replaced them with the supported `http_check` and `prometheus` receiver approach.
- Replaced an HTTP check against `cache.internal.company.com:6379` with an HTTP health endpoint, because port 6379 is typically Redis and would not answer an HTTP GET.
- Updated CoreDNS forward metrics from deprecated `coredns_forward_*` names to the current `coredns_proxy_request_duration_seconds{proxy_name="forward", ...}` metric.
- Updated cache miss guidance to derive misses from `coredns_cache_requests_total - coredns_cache_hits_total`, because `coredns_cache_misses_total` is deprecated.
- Replaced alert conditions that referenced non-existent or incorrectly aggregated metrics with valid PromQL-style expressions using histogram `_sum` / `_count` and aggregate rates.
- Fixed the Kubernetes relabel example so `__address__` is rewritten from the discovered pod address to port 9153, and escaped `$` as `$$` for the OpenTelemetry Collector Prometheus receiver.

## Review Notes
The alerting snippet is still presented as generic YAML with `condition` fields rather than a native PrometheusRule using `expr`. That is acceptable for the post's dashboard/alerting context, but future posts should name the alerting system or use native Prometheus rule syntax.
