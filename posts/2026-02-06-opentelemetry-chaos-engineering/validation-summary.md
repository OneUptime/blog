# Validation Summary: How to Use OpenTelemetry for Chaos Engineering Experiments

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry Python tracing and metrics APIs
- OpenTelemetry HTTP semantic conventions
- OpenTelemetry Prometheus exporter metric name translation
- Chaos engineering
- Istio VirtualService fault injection
- Kubernetes Python client and custom resources
- Prometheus PromQL
- Python

## Sources Consulted
- OpenTelemetry Python instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Python trace API documentation: https://opentelemetry-python.readthedocs.io/en/stable/api/trace.html
- OpenTelemetry Python metrics API documentation: https://opentelemetry-python.readthedocs.io/en/stable/api/metrics.html
- OpenTelemetry HTTP metrics semantic conventions: https://opentelemetry.io/docs/specs/semconv/http/http-metrics/
- OpenTelemetry Prometheus exporter specification: https://opentelemetry.io/docs/specs/otel/metrics/sdk_exporters/prometheus/
- Istio VirtualService reference, HTTPFaultInjection delay: https://istio.io/latest/docs/reference/config/networking/virtual-service/#HTTPFaultInjection
- Kubernetes API concepts and resource URI rules: https://kubernetes.io/docs/reference/using-api/api-concepts/
- Kubernetes custom resources documentation: https://kubernetes.io/docs/concepts/extend-kubernetes/api-extension/custom-resources/
- Kubernetes Python client CustomObjectsApi documentation: https://raw.githubusercontent.com/kubernetes-client/python/master/kubernetes/docs/CustomObjectsApi.md
- Prometheus histogram_quantile documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/#histogram_quantile

## Issues Found
- The OpenTelemetry Python exception status example used `experiment_span.set_status(StatusCode.ERROR, str(e))`. Updated it to import `Status` and call `experiment_span.set_status(Status(StatusCode.ERROR, str(e)))`, matching the documented OpenTelemetry Python pattern for setting error status with a description.
- The `experiment_phase` context manager only recorded phase duration after a successful phase body. Wrapped the span body in `try`/`finally` so the duration metric is recorded even if a phase raises an exception.
- The latency injection example used raw unauthenticated HTTP requests to a non-namespaced Kubernetes API path for an Istio `VirtualService`. Replaced this with the Kubernetes Python client's `CustomObjectsApi.create_namespaced_custom_object` and `delete_namespaced_custom_object`, added the namespace, and updated the Istio API version to `networking.istio.io/v1`.
- The Prometheus validation queries used non-standard metric names (`http_server_request_errors_total`, `http_server_request_total`, and `http_server_request_duration_bucket`) for OpenTelemetry HTTP metrics. Updated them to use the Prometheus-translated OpenTelemetry HTTP duration histogram series: `http_server_request_duration_seconds_count` and `http_server_request_duration_seconds_bucket`.
- The p99 latency query returned seconds but compared the result directly to a millisecond target. Updated the code to convert `p99_seconds` to `p99_ms` before comparison and reporting.

## Review Notes
- The Kubernetes example assumes it runs inside a pod with RBAC permission to create and delete Istio `VirtualService` resources in the target namespace.
- The Prometheus queries assume the backend uses the OpenTelemetry Prometheus exporter's default translation strategy, which escapes dots to underscores and appends unit suffixes.
- The post's chaos engineering guidance is technically sound, but production experiments should also include explicit stop conditions and authorization controls.
