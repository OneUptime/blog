# Validation Summary: How to Monitor Flash Sale and High-Traffic Event Performance with OpenTelemetry

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry Python API
- OpenTelemetry Collector
- Prometheus exporter and Prometheus metrics
- Kubernetes HorizontalPodAutoscaler autoscaling/v2
- Kubernetes custom metrics API
- Python async middleware instrumentation

## Sources Consulted
- OpenTelemetry Python metrics API: https://opentelemetry-python.readthedocs.io/en/stable/api/metrics.html
- OpenTelemetry Metrics API specification: https://opentelemetry.io/docs/specs/otel/metrics/api/
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector Prometheus exporter documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/prometheusexporter/README.md
- Kubernetes HorizontalPodAutoscaler v2 API reference: https://kubernetes.io/docs/reference/kubernetes-api/autoscaling/horizontal-pod-autoscaler-v2/
- Kubernetes Horizontal Pod Autoscaling documentation: https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/
- Kubernetes HPA walkthrough for custom metrics behavior: https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale-walkthrough/

## Issues Found
- The middleware used `time.time()` to measure request latency. Changed it to `time.perf_counter()` so latency measurement uses a monotonic clock and is not affected by wall-clock adjustments.
- The middleware populated `http.route` from `request.path`. Changed the example to use `get_route_template(request)` so `http.route` represents a route template rather than a raw path, matching OpenTelemetry semantic convention intent and avoiding high-cardinality path values.
- The autoscaling section said the HPA scrapes the Collector's Prometheus endpoint. Kubernetes HPA does not scrape Prometheus directly; it queries metrics through Kubernetes resource, custom, or external metrics APIs. Updated the text and config comment to describe Prometheus scraping plus a custom metrics adapter.
- The HPA example referenced `http_requests_total_rate` as though the Collector emitted that metric directly. Updated the text to state that the HPA metric names assume Prometheus recording rules and adapter rules, and renamed the request-rate metric to `http_requests_per_second`.

## Review Notes
The OpenTelemetry Python instrument creation examples use current metrics API shapes, including counters, up-down counters, histograms, and observable gauges with callbacks. The Collector pipeline shape and Prometheus exporter endpoint setting are valid, but the example remains illustrative because production deployments still need authentication/TLS settings, Prometheus scrape configuration, recording rules, and a custom metrics adapter configuration.
