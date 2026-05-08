# Validation Summary: Monitoring Cilium L7 Traffic Shifting in Production

## Status
validated

## Post Type
Guide

## Technologies Covered
- Cilium L7 traffic shifting
- Kubernetes
- Hubble CLI
- Envoy Prometheus metrics
- Prometheus PromQL
- Prometheus Operator PrometheusRule
- Grafana

## Sources Consulted
- Cilium L7 Traffic Shifting documentation: https://docs.cilium.io/en/latest/network/servicemesh/envoy-traffic-shifting/
- Cilium Gateway API traffic splitting documentation: https://docs.cilium.io/en/latest/network/servicemesh/gateway-api/splitting/
- Cilium Monitoring & Metrics documentation: https://docs.cilium.io/en/stable/observability/metrics/
- Cilium Hubble CLI documentation: https://docs.cilium.io/en/latest/observability/hubble/hubble-cli/
- Hubble observe CLI flag definitions in Cilium source: https://fossies.org/linux/cilium/hubble/cmd/observe/flows.go
- Envoy cluster manager statistics documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/upstream/cluster_manager/cluster_stats
- Prometheus histogram_quantile documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/#histogram_quantile
- Prometheus Operator API reference for PrometheusRule: https://prometheus-operator.dev/docs/api-reference/api/#prometheusrule

## Issues Found
- The Hubble example used `--http-status 500-599`. Current Hubble observe filtering expects an HTTP status code prefix such as `404` or `5+`, not a numeric range. Changed it to `--http-status 5+`.
- The p99 latency query passed raw Envoy histogram bucket rates directly to `histogram_quantile`. That is syntactically valid, but it does not aggregate multiple scraped Envoy series for the same cluster and can produce fragmented per-instance results. Changed it to `sum by (le, envoy_cluster_name) (...)` so the query returns per-cluster latency percentiles.

## Review Notes
- The Envoy metric names used in the post match Envoy cluster statistics exposed in Prometheus format, but real Cilium cluster names depend on the specific CiliumEnvoyConfig or Gateway API configuration. Operators should adjust the `envoy_cluster_name` regular expressions to match their generated cluster names.
- Cilium documentation notes that L7 HTTP metrics require Layer 7 visibility or L7 proxy paths that produce HTTP observations. The prerequisites mention Hubble and L7 traffic shifting, but production setups should still verify that Prometheus is scraping Cilium Envoy metrics.
