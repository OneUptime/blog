# Validation Summary: How to Monitor Circuit Breaker Status in Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio
- Envoy sidecar proxy
- Kubernetes
- Prometheus and PromQL
- Prometheus Operator PrometheusRule
- Grafana
- Bash

## Sources Consulted
- Istio Envoy Statistics documentation: https://istio.io/latest/docs/ops/configuration/telemetry/envoy-stats/
- Istio Prometheus integration documentation: https://istio.io/latest/docs/ops/integrations/prometheus/
- Istio DestinationRule reference: https://preliminary.istio.io/latest/docs/reference/config/networking/destination-rule/
- Envoy cluster statistics reference: https://www.envoyproxy.io/docs/envoy/latest/configuration/upstream/cluster_manager/cluster_stats.html
- Envoy admin interface documentation: https://www.envoyproxy.io/docs/envoy/latest/operations/admin.html
- Envoy outlier detection architecture documentation: https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/upstream/outlier
- Envoy stats configuration API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/metrics/v3/stats.proto.html
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/

## Issues Found
- The post's supplied draft implied the detailed Envoy circuit breaker metrics are exposed automatically. The README now correctly notes that Istio exposes standard Prometheus metrics automatically, while many detailed Envoy cluster stats must match `proxyStatsMatcher` before they are recorded.
- The supplied draft used raw `curl localhost:15000` admin calls. The README now uses Istio's documented `pilot-agent request GET` pattern for sidecar admin stats and clusters.
- The supplied draft described healthy `/clusters` output as having no flags. The README now matches Envoy's admin output by describing healthy hosts as `healthy` and outlier-ejected hosts as `/failed_outlier_check`.
- The outlier metric list contained a duplicated `outlier_detection.ejections_enforced_total` entry. I changed the duplicate to `outlier_detection.ejections_enforced_consecutive_5xx`, which is the specific enforced consecutive-5xx counter documented by Envoy.
- The quick health check script was described as running across the mesh, but the command only lists pods in the current namespace. I changed the description and comment to say current namespace.
- The supplied draft's script could produce empty values when matching stats were absent, causing numeric comparisons to fail. The README now prints `sum+0` from `awk` and quotes the pod name in `kubectl exec`.

## Review Notes
Prometheus label names for Envoy stats can vary with Envoy/Istio stats tag extraction and local scrape configuration. The metric names and PromQL structure are valid, but operators should confirm the exact labels in their Prometheus before copying dashboard queries into production.
