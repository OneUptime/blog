# Validation Summary: How to Monitor Load Balancing Effectiveness in Istio

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio
- Envoy
- Prometheus and PromQL
- Grafana
- Kiali
- Kubernetes kubectl

## Sources Consulted
- Istio Standard Metrics: https://istio.io/latest/docs/reference/config/metrics/
- Istio Kiali integration documentation: https://istio.io/latest/docs/ops/integrations/kiali/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio sample Prometheus addon configuration: https://raw.githubusercontent.com/istio/istio/release-1.30/samples/addons/prometheus.yaml
- Envoy cluster statistics documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/upstream/cluster_manager/cluster_stats.html
- Envoy admin interface documentation: https://www.envoyproxy.io/docs/envoy/latest/operations/admin
- Prometheus query functions documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus operators documentation: https://prometheus.io/docs/prometheus/latest/querying/operators/

## Issues Found
- The post used per-pod PromQL aggregations without stating that `pod` is scrape metadata rather than an Istio standard metric dimension. Added a short note explaining that the queries assume the Prometheus scrape configuration preserves the Kubernetes pod name as `pod`.
- The outlier ejection examples used `envoy_cluster_outlier_detection_ejections_total`, but current Envoy cluster stats document enforced outlier ejections as `ejections_enforced_total`. Updated the PromQL examples and alert to use `envoy_cluster_outlier_detection_ejections_enforced_total`.
- The `UnevenLoadDistribution` alert had invalid PromQL aggregation syntax by applying `by (destination_service)` to a parenthesized binary expression. Rewrote it to use `max by (destination_service)` and `avg by (destination_service)` around the per-service, per-pod request rates.
- The Kiali installation command was pinned to Istio `release-1.20`, which is outdated. Updated it to `release-1.30`, matching the current Istio documentation on 2026-05-21.

## Review Notes
The Grafana snippets are panel fragments rather than complete dashboard JSON, but the PromQL expressions inside them are valid for the assumptions stated in the post. Envoy Prometheus metric labels can vary with bootstrap stat tag extraction and scrape configuration; operators should confirm label names in their own Prometheus before copying the Envoy metric selectors verbatim.
