# Validation Summary: How to Monitor Data Plane Performance

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio
- Envoy
- Prometheus and PromQL
- Kubernetes and kubectl
- Kiali

## Sources Consulted
- Istio Standard Metrics: https://istio.io/latest/docs/reference/config/metrics/
- Istio Prometheus integration: https://istio.io/latest/docs/ops/integrations/prometheus/
- Istio Envoy statistics configuration: https://istio.io/latest/docs/ops/configuration/telemetry/envoy-stats/
- Istio pilot-discovery exported metrics: https://istio.io/latest/docs/reference/commands/pilot-discovery/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio Debugging Envoy and Istiod: https://istio.io/latest/docs/ops/diagnostic-tools/proxy-cmd/
- Istio Kiali integration: https://istio.io/latest/docs/ops/integrations/kiali/
- Envoy cluster manager statistics: https://www.envoyproxy.io/docs/envoy/latest/configuration/upstream/cluster_manager/cluster_stats.html
- Envoy listener statistics: https://www.envoyproxy.io/docs/envoy/latest/configuration/listeners/stats
- Prometheus query functions: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus alerting rules: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Kubernetes kubectl reference: https://kubernetes.io/docs/reference/kubectl/kubectl-cmds/

## Issues Found
- The single-service p99 latency query passed unaggregated bucket series to `histogram_quantile`, which would not produce a service-level percentile when multiple series exist. Changed it to aggregate buckets with `sum(rate(...)) by (le)`.
- The single-service error-rate query divided 5xx series by unaggregated request series, which could match per-response-code series instead of total traffic. Changed both numerator and denominator to `sum(rate(...))`.
- The Envoy admin examples used direct `curl` calls to localhost port 15000. Changed them to `pilot-agent request GET stats`, matching current Istio-supported proxy stats access.
- The post implied all Envoy stats are available by default. Added the current Istio caveat that only a minimal Envoy stat set is recorded unless `proxyStatsMatcher` includes additional stats.
- The manual Prometheus scrape configuration filtered on the `istio-proxy` container and rewrote to port 15020 using an annotation-dependent relabel rule. Replaced it with Istio's documented manual scrape job using container ports ending in `-envoy-prom`.
- The control-plane push metric used `pilot_proxy_push_time_bucket`, which is not the current exported metric name. Changed it to `pilot_xds_push_time_bucket`.
- The push error metric used `pilot_xds_push_errors`, which is not listed in current Istio exported metrics. Replaced it with `pilot_total_xds_internal_errors` and `pilot_total_xds_rejects`.
- The Kiali install command was pinned to the old Istio `release-1.20` sample manifest. Updated it to the current documented `release-1.30` sample URL.
- The quick health-check section used a direct `curl` call to istiod's debug endpoint for sync data. Replaced it with the documented `istioctl x internal-debug syncz` command.

## Review Notes
- The article is technically relevant and includes commands, configuration, and PromQL examples, so it was reviewed as a technical guide.
- The Istio sample addon manifests are intended for demonstration and are not tuned for production performance or security.
- Metrics merge exposes plaintext metrics on the sidecar telemetry endpoint; secure scraping requires additional Istio configuration.
