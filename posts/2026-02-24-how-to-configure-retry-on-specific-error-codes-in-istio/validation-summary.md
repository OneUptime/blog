# Validation Summary: How to Configure Retry on Specific Error Codes in Istio

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Istio VirtualService
- Istio HTTPRetry policy
- Kubernetes custom resources
- Envoy retry policies
- Prometheus / PromQL retry metrics
- gRPC retry status codes

## Sources Consulted
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Envoy router retry policy documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/router_filter.html

## Issues Found
- The post said Istio's default `retryOn` value was only `connect-failure,refused-stream`. Updated it to `connect-failure,refused-stream,unavailable,cancelled`, matching the current Istio `HTTPRetry` default.
- The post said VirtualService cannot retry individual HTTP status codes directly and requires EnvoyFilter. Updated the specific-code examples to use numeric status codes directly in `retryOn`, such as `retryOn: "503"` and `retryOn: "503,429,502"`, which current Istio supports.
- The post described `retriable-status-codes` as being used with `retryRemoteLocalities`. Corrected this to describe Envoy's `retriable_status_codes` behavior and noted that Istio VirtualService supports numeric status codes directly in `retryOn`.
- The combined specific-code example used EnvoyFilter and Envoy route fields where VirtualService is sufficient. Replaced it with a current `networking.istio.io/v1` VirtualService example.
- The 429 example used `retriable-4xx`, which only covers 409 Conflict in Envoy. Updated it to retry `429` explicitly.
- The post said Istio does not support retry backoff in VirtualService. Updated it to use and explain the current `backoff` field.
- The per-route example split URI and method into separate match entries, which gives OR semantics. Moved `method` into the same match block as the URI so the example matches GET requests to `/api/read` as described.
- Updated VirtualService examples from `networking.istio.io/v1beta1` to the current `networking.istio.io/v1` API version.

## Review Notes
The Envoy retry metrics shown are proxy-level metrics and may require Envoy stats inclusion/merge settings in some Istio installations. The retry concepts and corrected VirtualService fields match current Istio documentation.
