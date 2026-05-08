# Validation Summary: Monitoring Cilium L7 Circuit Breaking in Production

## Status
validated

## Post Type
Guide

## Technologies Covered
- Cilium
- Cilium L7 proxy / Envoy
- Hubble CLI
- Kubernetes
- Prometheus
- Prometheus Operator PrometheusRule
- jq
- Mermaid

## Sources Consulted
- Cilium Monitoring & Metrics documentation: https://docs.cilium.io/en/stable/observability/metrics/
- Cilium Envoy proxy documentation: https://docs.cilium.io/en/stable/security/network/proxy/envoy/
- Cilium Hubble CLI documentation: https://docs.cilium.io/en/latest/observability/hubble/hubble-cli/
- Cilium `cilium-dbg envoy admin metrics` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_envoy_admin_metrics/
- Cilium flow API / Hubble protocol documentation: https://docs.cilium.io/en/stable/_api/v1/flow/README/
- Envoy circuit breaking documentation: https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/upstream/circuit_breaking
- Envoy cluster statistics documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/upstream/cluster_manager/cluster_stats
- Prometheus Operator API reference for PrometheusRule: https://prometheus-operator.dev/docs/api-reference/api/

## Issues Found
- The introduction referred to circuit breaker "open/close events." Envoy exposes circuit breaker open state as gauges such as `cx_open`, `rq_pending_open`, `rq_open`, and `rq_retry_open`, not open/close event streams. Changed this to "open gauges."
- The metric list omitted `envoy_cluster_upstream_rq_active_overflow`, which Envoy documents as the counter for requests rejected when the `max_requests` circuit breaker is exhausted. Added it to the PromQL examples.
- The Hubble example used `--verdict DROPPED` for HTTP error monitoring. Dropped verdicts are not the same as HTTP 5xx responses. Replaced it with `--http-status 5+` while keeping the later JSON filter for 503 responses.
- The verification command used `curl localhost:9901/stats`, which is the common standalone Envoy admin endpoint but is not the documented Cilium way to inspect Envoy Prometheus metrics. Replaced it with `cilium-dbg envoy admin metrics --filter overflow`.

## Review Notes
- The Envoy Prometheus metric names and PrometheusRule structure are valid for Cilium environments that scrape Envoy metrics.
- Hubble L7 visibility still depends on traffic being redirected through the Cilium L7 proxy by policy, ingress, Gateway API, or protocol visibility configuration.
- The alert threshold is intentionally simple for an example; production alerts should usually aggregate by relevant labels and tune thresholds to expected traffic volume.
