# Validation Summary: How to Monitor Per-Tenant Metrics in Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio service mesh
- Istio Telemetry API
- Envoy metrics attributes
- Prometheus and PromQL
- Prometheus Operator `PrometheusRule`
- Grafana dashboards
- Kubernetes `kubectl`

## Sources Consulted
- Istio Standard Metrics: https://istio.io/latest/docs/reference/config/metrics/
- Istio Telemetry API reference: https://istio.io/latest/docs/reference/config/telemetry/
- Istio Customizing Metrics task: https://istio.io/latest/docs/tasks/observability/metrics/customize-metrics/
- Istio Prometheus integration: https://istio.io/latest/docs/ops/integrations/prometheus/
- Istio Grafana integration: https://istio.io/latest/docs/ops/integrations/grafana/
- Envoy attributes reference: https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/advanced/attributes
- Prometheus query functions: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus alerting rules: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Prometheus Operator alerting documentation: https://prometheus-operator.dev/docs/developer/alerting/

## Issues Found
- The post implied Prometheus might be installed by Istio's demo or default profile. Istio documents Prometheus as a separate sample addon, so the wording now says to install the sample addon for a quick demo setup.
- The Istio sample addon URLs used the old `release-1.22` branch. Updated the Prometheus and Grafana sample addon URLs to the current `release-1.30` branch shown in the official Istio docs.
- The custom Telemetry metric label used the unsupported pipe fallback operator in a CEL expression. Replaced it with the supported CEL conditional expression using the `in` operator.
- The TCP connection query was labeled as active connections even though it is derived from opened and closed counters. Updated the wording to "Estimated active TCP connections" and rewrote the query as grouped counter subtraction.
- The alerting section used a `PrometheusRule` resource without noting that this CRD comes from Prometheus Operator. Updated the wording to make that prerequisite explicit.

## Review Notes
The PromQL request rate, error rate, latency histogram, byte-rate, dashboard variable, and recording rule examples are consistent with Istio's standard metric names and Prometheus histogram/rate query patterns. The Istio sample Prometheus and Grafana addons are documented as demonstration installs and are not tuned for production-scale monitoring.
