# Validation Summary: How to Customize Metrics Collection with Telemetry API in Istio

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

## Sources Consulted
- Istio Telemetry API reference: https://istio.io/latest/docs/reference/config/telemetry/
- Istio standard metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- Istio Customizing Metrics with Telemetry API task: https://istio.io/latest/docs/tasks/observability/metrics/telemetry-api/
- Istio Classifying Metrics Based on Request or Response task: https://istio.io/latest/docs/tasks/observability/metrics/classify-metrics/
- Kubernetes kubectl port-forward reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_port-forward/
- Kubernetes kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Common Expression Language overview: https://cel.dev/overview/cel-overview

## Issues Found
- The default metric table omitted Istio's standard gRPC message metrics, `istio_request_messages_total` and `istio_response_messages_total`. Added both metrics to match the official Istio standard metrics reference.
- The custom header and proxy metadata examples used `|| 'unknown'` as a fallback expression. CEL `||` is a boolean logical operator, not a string coalescing operator, so the examples would not type-check as written. Replaced them with conditional expressions using map key membership checks.
- The environment-label example described `node.metadata` as environment variables in the proxy container. Updated the wording to "proxy metadata" to match Istio's Telemetry API reference.
- The Envoy stats verification command used `pilot-agent request GET stats/prometheus`. Replaced it with the officially documented `kubectl exec ... curl -sS 'localhost:15000/stats/prometheus'` pattern.

## Review Notes
The Telemetry API examples use `apiVersion: telemetry.istio.io/v1`, valid metric enum names, `tagOverrides`, `UPSERT`, `REMOVE`, and `disabled` fields consistent with the current Istio documentation. The post assumes Prometheus is available as `svc/prometheus` in `istio-system`, which is common in Istio sample installs but may vary by deployment.
