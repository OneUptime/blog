# Validation Summary: How to Create Istio Dashboards in OneUptime

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio
- OneUptime dashboards and metrics
- Prometheus and PromQL
- Envoy metrics
- Kubernetes container metrics

## Sources Consulted
- Istio Standard Metrics: https://istio.io/latest/docs/reference/config/metrics/
- Istio Telemetry API metric names: https://istio.io/latest/docs/reference/config/telemetry/
- Istio pilot-discovery exported metrics: https://istio.io/latest/docs/reference/commands/pilot-discovery/
- Prometheus PromQL functions, including `rate()` and `histogram_quantile()`: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus querying basics and operators: https://prometheus.io/docs/prometheus/latest/querying/basics/
- Envoy listener statistics: https://www.envoyproxy.io/docs/envoy/latest/configuration/listeners/stats
- Envoy server statistics: https://www.envoyproxy.io/docs/envoy/latest/configuration/observability/statistics
- OneUptime dashboards product documentation: https://oneuptime.com/product/dashboards
- OneUptime metrics product documentation: https://oneuptime.com/product/metrics

## Issues Found
- Istio request and latency queries did not specify `reporter`, which can double count mesh and service traffic because Istio exports metrics from source and destination reporters. Added `reporter="destination"` to mesh overview, service detail, TCP, and recording-rule examples where the dashboard is measuring destination-side service traffic.
- The control-plane push-rate query used `pilot_xds_pushes` as a general push counter. Current Istio documentation lists `pilot_push_triggers` as the metric for push trigger counts, so the query now uses `sum(rate(pilot_push_triggers[5m])) by (reason)`.
- The control-plane error query used `pilot_xds_push_errors`, which is not listed in current Istio exported metrics. Replaced it with the documented `pilot_total_xds_internal_errors`.
- The ingress gateway traffic query filtered on the gateway as `destination_service`, which does not match the usual Istio gateway reporting perspective. Updated gateway request, response-code, and latency queries to use `reporter="source"` with `source_workload="istio-ingressgateway"` and `source_workload_namespace="istio-system"`.

## Review Notes
- The PromQL examples are syntactically valid for Prometheus classic histogram usage: `histogram_quantile()` keeps `le` in the aggregation, and `rate()` is used for counters and histogram buckets.
- The OneUptime dashboard guidance is consistent with OneUptime's documented support for custom dashboards, dashboard variables/filters, and PromQL-compatible metrics querying.
- The Envoy `envoy_server_total_connections` query is plausible when Envoy server stats are scraped and translated to Prometheus names, but exact metric availability depends on which Envoy/Istio stats are included in the Prometheus scrape configuration.
