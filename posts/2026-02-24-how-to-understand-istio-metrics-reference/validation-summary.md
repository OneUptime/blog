# Validation Summary: How to Understand Istio Metrics Reference

## Status
validated

## Post Type
Reference

## Technologies Covered
- Istio
- Envoy
- Prometheus
- PromQL
- Kubernetes
- Istio Telemetry API

## Sources Consulted
- Istio Standard Metrics: https://istio.io/latest/docs/reference/config/metrics/
- Istio Telemetry API reference: https://istio.io/latest/docs/reference/config/telemetry/
- Istio Prometheus integration: https://istio.io/latest/docs/ops/integrations/prometheus/
- Istio secure Prometheus scraping: https://istio.io/latest/docs/tasks/observability/metrics/secure-metrics/
- Istio istioctl metrics reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Envoy access log response flags: https://www.envoyproxy.io/docs/envoy/latest/configuration/observability/access_log/usage.html

## Issues Found
- The post said it covered every standard Istio metric. Istio's standard metrics reference is specifically for service-level metrics, while the post also discusses a small set of control-plane metrics. Updated the wording to "standard service-level metrics."
- The post implied sidecar metrics are always exposed on port 15020. Updated the wording to clarify that this is true with Prometheus metrics merging enabled; Istio also documents Envoy-only telemetry on port 15090.
- The post stated that every request generates metrics on both source and destination sides. Updated this to clarify that both sides are generated when both sides are observed by Istio proxies.
- The Standard Labels section implied all labels exist on every metric. Updated the wording and specific label descriptions for `response_code`, `grpc_response_status`, and `connection_security_policy` to match Istio's protocol and reporter caveats.
- The `source_principal` and `destination_principal` descriptions over-specified SPIFFE/mTLS behavior. Updated them to match Istio's "peer principal when peer authentication is used" wording.
- The control-plane metric `pilot_xds_pushes` was described as counting configuration pushes. Current Istio documentation lists `pilot_push_triggers` as the metric for push triggers, while `pilot_xds_pushes` is documented for Pilot XDS build/send errors. Replaced the section with `pilot_push_triggers` and updated the query.
- The post listed older conflict metrics that are not in the current Istio metrics reference. Replaced them with documented current metrics `pilot_total_rejected_configs` and `pilot_total_xds_internal_errors`.
- The Telemetry API example used `telemetry.istio.io/v1alpha1`. Updated it to the current `telemetry.istio.io/v1` API version.

## Review Notes
The PromQL examples are syntactically valid for the metric names and labels shown. The response flag list is not exhaustive for all current Envoy flags, but the listed flags and meanings are valid common values.
