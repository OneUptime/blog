# Validation Summary: How to Set Up Traffic Volume Monitoring in Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio service mesh
- Istio Telemetry API
- Prometheus and PromQL
- Kubernetes kubectl
- Prometheus Operator PrometheusRule
- Grafana
- Kiali
- Envoy sidecar metrics

## Sources Consulted
- Istio Standard Metrics: https://istio.io/latest/docs/reference/config/metrics/
- Istio Telemetry API reference: https://istio.io/latest/docs/reference/config/telemetry/
- Istio Prometheus integration: https://istio.io/latest/docs/ops/integrations/prometheus/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio application ports and metrics endpoints: https://istio.io/latest/docs/ops/deployment/application-requirements/
- Istio Envoy statistics: https://istio.io/latest/docs/ops/configuration/telemetry/envoy-stats/
- Prometheus query functions: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus querying basics and subquery syntax: https://prometheus.io/docs/prometheus/latest/querying/basics/
- Prometheus alerting rules: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/

## Issues Found
- The Prometheus add-on command used the old Istio `release-1.20` sample manifest. Updated it to `release-1.29`, matching the current Istio Prometheus integration documentation.
- The HTTP method section described a method breakdown but first showed a query grouped by `request_protocol` and `response_code`. Updated the surrounding text to correctly describe that query as using default protocol and response-code labels, then left the Telemetry API example as the method-level setup.

## Review Notes
The Istio Prometheus add-on manifest is a quick-start/demo deployment and is not tuned for production scale or security. The post's Prometheus, Telemetry API, `istioctl dashboard`, Kiali, and raw metrics endpoint examples are otherwise consistent with current official documentation.
