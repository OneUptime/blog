# Validation Summary: How to Configure Metric Label Overrides with Telemetry API

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio Telemetry API
- Istio standard metrics
- Prometheus
- Kubernetes kubectl
- CEL expressions
- Envoy attributes

## Sources Consulted
- Istio Telemetry API reference: https://istio.io/latest/docs/reference/config/telemetry/
- Istio standard metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- Istio Customizing Istio Metrics with Telemetry API task: https://istio.io/latest/docs/tasks/observability/metrics/telemetry-api/
- Istio Customizing Istio Metrics task: https://istio.io/latest/docs/tasks/observability/metrics/customize-metrics/
- Envoy attributes reference: https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/advanced/attributes
- Istio API telemetry.proto source: https://github.com/istio/api/blob/master/telemetry/v1alpha1/telemetry.proto

## Issues Found
- Several CEL examples used `||` as a string fallback operator for missing headers or metadata. Istio's metric expression documentation says to use CEL `has` or `in` checks for defaults, so these examples were changed to conditional expressions using `in`.
- The proxy metrics verification command used `pilot-agent request GET stats/prometheus`. The official Istio metric customization docs verify proxy metrics with `curl -sS 'localhost:15000/stats/prometheus'`, so the command was updated to that form.
- The override-order pitfall claimed later overrides can reference labels created by earlier entries. Official docs say overrides are applied in order and should be ordered from least specific to most specific, but tag values are CEL expressions over attributes. The note was corrected to describe ordered override application without implying label-to-label references.

## Review Notes
The Telemetry API version, `tagOverrides` field, `UPSERT` and `REMOVE` operations, metric enum names, workload modes, default Istio label names, and Prometheus metric names were consistent with current Istio documentation. The percentage cardinality reduction examples are workload-dependent estimates rather than guaranteed outcomes.
