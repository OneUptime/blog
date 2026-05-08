# Validation Summary: Monitoring Cilium L7 Path Translation in Production

## Status
validated

## Post Type
Guide

## Technologies Covered
- Cilium
- Kubernetes
- CiliumEnvoyConfig
- Envoy
- Hubble
- Prometheus
- Grafana
- Prometheus Operator PrometheusRule
- jq

## Sources Consulted
- Cilium Monitoring & Metrics documentation: https://docs.cilium.io/en/stable/observability/metrics/
- Cilium Hubble CLI documentation: https://docs.cilium.io/en/latest/observability/hubble/hubble-cli/
- Cilium Layer 7 Protocol Visibility documentation: https://docs.cilium.io/en/stable/observability/visibility/
- Cilium L7 Path Translation documentation: https://docs.cilium.io/en/latest/network/servicemesh/envoy-custom-listener/
- Cilium status command reference: https://docs.cilium.io/en/latest/cmdref/cilium_status/
- Envoy HTTP connection manager statistics documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_conn_man/stats
- Prometheus histogram_quantile documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Hubble observe flag reference from the Cilium Hubble project: https://github.com/cilium/hubble/issues/1280

## Issues Found
- The Hubble HTTP status example used `--http-status 500-599`. Hubble's documented filter syntax matches status prefixes such as `404` or `5+`, so the command was changed to `--http-status 5+`.
- The Envoy latency query used `histogram_quantile()` directly over classic histogram buckets without aggregation by `le`. Prometheus requires preserving the `le` label when aggregating classic histogram buckets, so the query and alert expression now use `sum by (le) (rate(..._bucket[5m]))`.
- The post described `envoy_http_downstream_rq_time_bucket` as latency added by the proxy. Envoy documents `downstream_rq_time` as total request/response time in milliseconds, so the wording now says latency observed by the proxy.
- The alert threshold compared Envoy request time to `2`, which is 2 milliseconds for Envoy's request-time histogram. The threshold was changed to `2000` to represent 2 seconds.
- The 5xx query now wraps the rate in `sum()` so it returns an aggregate error rate rather than one time series per metric label set.
- The verification command `cilium status | grep "L7 Proxy"` depended on output text that is not documented by the current Cilium CLI reference. It was changed to the documented `cilium status --wait` command.

## Review Notes
Envoy and Hubble metrics can expose sensitive L7 data such as URLs, and Cilium documents redaction options for production environments. The post's commands are otherwise valid examples assuming Cilium Envoy metrics are enabled and scraped, Hubble is enabled, and L7 visibility or CiliumEnvoyConfig routing is configured.
