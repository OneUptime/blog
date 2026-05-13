# Validation Summary: Monitor Ingress Gateway Canary Rollouts with Calico

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico Ingress Gateway
- Kubernetes Gateway API
- HTTPRoute weighted backend traffic splitting
- Envoy Gateway / Envoy Proxy metrics
- Prometheus and PrometheusRule alerting
- Kubernetes `kubectl`
- OneUptime synthetic monitoring

## Sources Consulted
- Calico documentation: Calico Ingress Gateway: https://docs.tigera.io/calico/latest/networking/ingress-gateway/about-calico-ingress-gateway
- Calico documentation: Create an ingress gateway: https://docs.tigera.io/calico/latest/networking/ingress-gateway/create-ingress-gateway
- Calico documentation: Tutorial: Launch a canary deployment with Calico Ingress Gateway: https://docs.tigera.io/calico/latest/networking/ingress-gateway/tutorial-ingress-gateway-canary
- Kubernetes Gateway API documentation: HTTP traffic splitting: https://gateway-api.sigs.k8s.io/guides/traffic-splitting/
- Envoy Gateway documentation: HTTPRoute traffic splitting: https://gateway.envoyproxy.io/latest/tasks/traffic/http-traffic-splitting/
- Envoy Gateway documentation: Proxy metrics: https://gateway.envoyproxy.io/latest/tasks/observability/proxy-metric/
- Envoy documentation: Cluster manager statistics: https://www.envoyproxy.io/docs/envoy/latest/configuration/upstream/cluster_manager/cluster_stats.html
- Envoy documentation: Administration interface and `/stats/prometheus`: https://www.envoyproxy.io/docs/envoy/latest/operations/admin.html
- Prometheus documentation: Alerting rules: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Prometheus documentation: Query operators and vector matching: https://prometheus.io/docs/prometheus/latest/querying/operators/

## Issues Found
- The prerequisites listed Calico v3.27+, but the current Calico Open Source ingress gateway canary tutorial specifies Calico Open Source 3.30 or later. Updated the prerequisite to Calico v3.30+.
- The Envoy metric examples used `cluster_name` and `response_code_class` labels. Envoy Prometheus output commonly uses generated Envoy labels such as `envoy_cluster_name` and `envoy_response_code_class`. Updated the examples and added a note to inspect `/stats/prometheus` because Envoy Gateway generates cluster label values.
- The Prometheus error-rate query divided unsummed vectors, which can produce incorrect or empty results when there are multiple matching series. Updated the alert and gate script to use `sum(rate(...)) / sum(rate(...))`.
- The latency alert used `histogram_quantile()` directly over raw bucket rates. Prometheus histograms must be aggregated while preserving `le`, so the query now uses `sum by (le) (rate(..._bucket[5m]))`.
- The OneUptime canary-specific header example implied that `X-Canary: true` would route to the canary automatically. Updated the text to state that this requires an additional HTTPRoute rule that matches the header and routes to the canary backend.

## Review Notes
- The HTTPRoute weighted backend example is valid Gateway API usage; weights are proportional, and the example's 90/10 values produce a 90%/10% split.
- The Prometheus metric names and labels can vary with Envoy/Envoy Gateway configuration and scrape settings. The post now calls out that users should verify generated cluster labels in their own `/stats/prometheus` output before relying on the sample regexes.
