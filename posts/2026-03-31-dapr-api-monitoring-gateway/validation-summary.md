# Validation Summary: How to Implement API Monitoring with Dapr and API Gateway

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (sidecar metrics, tracing configuration, resiliency metrics)
- Kong API Gateway (Prometheus plugin, KongClusterPlugin CRD)
- Prometheus (scrape configuration, PromQL queries, alerting rules)
- Grafana (dashboard visualization)
- Zipkin / Jaeger (distributed tracing)
- Kubernetes (service discovery, pod annotations)

## Sources Consulted
- Kong Prometheus Plugin Overview: https://developer.konghq.com/plugins/prometheus/
- Kong Prometheus Plugin Configuration Reference: https://developer.konghq.com/plugins/prometheus/reference/
- Kong KongClusterPlugin CRD Reference: https://developer.konghq.com/kubernetes-ingress-controller/reference/custom-resources/
- Kong Prometheus + Grafana Guide: https://developer.konghq.com/kubernetes-ingress-controller/observability/prometheus-grafana/
- Dapr Metrics Reference: https://docs.dapr.io/operations/observability/metrics/
- Dapr Prometheus Setup Guide: https://docs.dapr.io/operations/observability/metrics/prometheus/
- Dapr Tracing Configuration: https://docs.dapr.io/operations/observability/tracing/
- Prometheus Configuration Documentation: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Prometheus Query Functions: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus Alerting Rules: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/

## Issues Found
1. **Incorrect terminology for alerting rules**: The post described the alerting rules section as "Define Grafana alerts for common SLO targets" but the YAML format shown (`groups > rules > alert/expr/for/labels/annotations`) is the standard Prometheus alerting rules format, not Grafana's native alerting format. Changed "Grafana alerts" to "Prometheus alerting rules" for accuracy.

## Review Notes
- Kong metrics endpoint: The post states metrics are at `http://kong-admin:8001/metrics` (Admin API). While technically correct, Kong's official documentation recommends using the Status API (port 8100 or 8007 depending on version) for Prometheus scraping, as the Admin API is typically firewalled or requires authentication. This is not incorrect but could be improved in a future revision.
- The Prometheus scrape config uses `"${1}:9090"` in the replacement field. While functionally equivalent to `$1:9090` in Go regex, the canonical Prometheus documentation style omits the curly braces. Both work correctly.
- All Kong metric names (`kong_http_requests_total`, `kong_request_latency_ms`, `kong_upstream_latency_ms`) verified correct.
- All Dapr metric names (`dapr_http_server_request_count`, `dapr_http_server_latency`, `dapr_resiliency_activations_total`) verified correct.
- Dapr tracing Configuration CRD structure and fields verified correct.
- Both PromQL queries are syntactically valid and follow standard patterns for error rate and P99 latency calculation.
- Prometheus relabel config correctly maps `dapr.io/enabled` annotation to `__meta_kubernetes_pod_annotation_dapr_io_enabled`.
