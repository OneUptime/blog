# Validation Summary: How to Track All Service Communication in Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio
- Kubernetes
- Prometheus and PromQL
- Envoy access logs
- Distributed tracing with Zipkin/Jaeger
- Kiali

## Sources Consulted
- Istio Standard Metrics: https://istio.io/latest/docs/reference/config/metrics/
- Istio Telemetry API: https://istio.io/latest/docs/reference/config/telemetry/
- Istio Telemetry API task: https://istio.io/latest/docs/tasks/observability/telemetry/
- Istio Envoy Access Logs: https://istio.io/latest/docs/tasks/observability/logs/access-log/
- Istio Configure Tracing with Telemetry API: https://istio.io/latest/docs/tasks/observability/distributed-tracing/telemetry-api/
- Istio Configure Trace Sampling: https://istio.io/latest/docs/tasks/observability/distributed-tracing/sampling/
- Istio Distributed Tracing Overview: https://istio.io/latest/docs/tasks/observability/distributed-tracing/overview/
- Istio Jaeger integration: https://istio.io/latest/docs/ops/integrations/jaeger/
- Istio Kiali integration: https://istio.io/latest/docs/ops/integrations/kiali/
- Istio Visualizing Your Mesh: https://istio.io/latest/docs/tasks/observability/kiali/
- Kubernetes kubectl logs reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/

## Issues Found
- The Telemetry API examples used `telemetry.istio.io/v1alpha1`. Current Istio documentation uses `telemetry.istio.io/v1`, so the access logging and tracing examples were updated.
- The tracing examples selected a `zipkin` provider without showing that the provider must be configured in `meshConfig.extensionProviders`. Added the minimal IstioOperator provider configuration for the Jaeger sample's Zipkin-compatible service.
- The tracing section implied distributed traces always show the full path without application involvement. Added the required caveat that applications must propagate tracing headers for multi-service traces to be connected.
- The Jaeger and Kiali sample add-on commands used the old `release-1.20` branch. Updated them to the current Istio documentation's `release-1.29` sample URLs.
- The post claimed arbitrary workload labels such as `team` and `data-classification` appear automatically in metrics and logs. Corrected this to state that standard `app` and `version` labels appear in Istio metric dimensions, while arbitrary labels require Telemetry metric tag overrides or log-pipeline enrichment.

## Review Notes
The PromQL examples, TCP metric names, access log configuration fields, `kubectl logs` usage, Kiali dashboard command, and performance considerations are consistent with current official documentation. The add-on YAML URLs are suitable for quick-start/demo use; production deployments should follow the respective Jaeger and Kiali production installation guidance.
