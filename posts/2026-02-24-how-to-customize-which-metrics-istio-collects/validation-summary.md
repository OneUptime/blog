# Validation Summary: How to Customize Which Metrics Istio Collects

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio
- Istio Telemetry API
- Prometheus
- Envoy proxy statistics
- Kubernetes manifests and kubectl
- istioctl

## Sources Consulted
- Istio Telemetry API reference: https://istio.io/latest/docs/reference/config/telemetry/
- Istio Standard Metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- Istio Customizing Istio Metrics with Telemetry API task: https://istio.io/latest/docs/tasks/observability/metrics/telemetry-api/
- Istio Customizing Istio Metrics task: https://istio.io/latest/docs/tasks/observability/metrics/customize-metrics/
- Istio Telemetry API task: https://istio.io/latest/docs/tasks/observability/telemetry/
- Istio Envoy Statistics operations guide: https://istio.io/latest/docs/ops/configuration/telemetry/envoy-stats/
- Istio Prometheus integration guide: https://istio.io/latest/docs/ops/integrations/prometheus/
- Istio v1 APIs announcement: https://istio.io/latest/blog/2024/v1-apis/

## Issues Found
- The post listed `REQUEST_BYTES` and `RESPONSE_BYTES` as Telemetry API metric selector values, but the official Istio Telemetry API uses `REQUEST_SIZE` and `RESPONSE_SIZE`. Updated all examples and the metric selector list.
- The post said the Telemetry API was stable since Istio 1.18. Official Istio documentation says Prometheus telemetry behavior changed in 1.18, while the `telemetry.istio.io/v1` API was promoted in Istio 1.22. Updated the version wording.
- The default metrics list omitted the standard gRPC message metrics. Added `istio_request_messages_total` and `istio_response_messages_total`.
- The namespace-level configuration text said namespace settings merge with mesh-wide configuration. Istio documents hierarchical inheritance, with specified fields overriding corresponding parent configuration. Updated the wording to avoid implying a simple merge.

## Review Notes
The examples use `localhost:15020/stats/prometheus`, which is valid for Istio merged Prometheus telemetry. Istio documentation also commonly shows `localhost:15000/stats/prometheus` or `istioctl x es -oprom` for direct Envoy stats inspection, so future revisions could mention the distinction.
