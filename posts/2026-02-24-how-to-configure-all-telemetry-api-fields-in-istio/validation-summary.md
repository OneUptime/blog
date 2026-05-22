# Validation Summary: How to Configure All Telemetry API Fields in Istio

## Status
validated

## Post Type
Reference guide

## Technologies Covered
- Istio Telemetry API
- Kubernetes custom resources
- Istio tracing configuration
- Istio metrics customization
- Istio access logging
- CEL expressions

## Sources Consulted
- Istio Telemetry API reference: https://istio.io/latest/docs/reference/config/telemetry/
- Istio task documentation for customizing metrics with the Telemetry API: https://istio.io/latest/docs/tasks/observability/metrics/telemetry-api/
- Istio task documentation for configuring tracing with the Telemetry API: https://istio.io/latest/docs/tasks/observability/distributed-tracing/telemetry-api/
- Istio task documentation for configuring access logs with the Telemetry API: https://istio.io/latest/docs/tasks/observability/logs/telemetry-api/

## Issues Found
- The examples used `apiVersion: telemetry.istio.io/v1alpha1`. Updated them to `telemetry.istio.io/v1`, which is the current API version shown in Istio 1.30 documentation.
- The top-level example included both `selector` and `targetRef`, which is invalid because Istio allows at most one of `selector` or `targetRefs`. Removed `targetRef` from that example.
- The post referred to singular `targetRef`. Updated this to `targetRefs` and changed the YAML to a list, matching the current Telemetry API schema.
- The tracing example used `useRequestIdForTracePropagation`, which is not a Telemetry API field. Replaced it with `disableContextPropagation` and corrected the explanation to match Istio's documented behavior.
- One metrics override used `metric: ALL_METRICS` and `customMetric` in the same selector, but those fields are mutually exclusive. Split the custom metric match into a separate override and clarified the oneof relationship in the text.

## Review Notes
The remaining examples and explanations align with the current Istio Telemetry API reference. Istio documents `targetRefs` caveats for multi-revision upgrades before Istio 1.22 and waypoint proxies; this post does not cover those version-specific details, but the omission does not make the included examples incorrect.
