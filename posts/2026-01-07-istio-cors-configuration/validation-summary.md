# Validation Summary: How to Configure CORS Policies in Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio VirtualService, Gateway, DestinationRule, EnvoyFilter, and Telemetry API
- Envoy CORS filter and access logging
- Kubernetes custom resources
- CORS HTTP headers and browser preflight behavior
- Prometheus Operator ServiceMonitor and PromQL
- `istioctl` debugging commands

## Sources Consulted
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio `istioctl` command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio standard metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- Istio custom metrics documentation: https://istio.io/latest/docs/tasks/observability/metrics/customize-metrics/
- Istio v1 APIs announcement: https://istio.io/latest/blog/2024/v1-apis/
- Envoy CORS filter documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/cors_filter
- MDN Access-Control-Max-Age reference: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Access-Control-Max-Age
- MDN Access-Control-Expose-Headers reference: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Access-Control-Expose-Headers
- MDN Set-Cookie reference: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Set-Cookie
- MDN CORS guide: https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS

## Issues Found
- The prerequisite version said Istio 1.18+ without caveating the `telemetry.istio.io/v1` example. Istio promoted Telemetry APIs to v1 in 1.22, so the prerequisite and monitoring section now state that the Telemetry API example requires Istio 1.22+.
- The first PromQL comment claimed the query counted preflights by origin, but the query grouped by `source_workload`. The comment was corrected to match the query.

## Review Notes
The Istio examples use current `networking.istio.io/v1beta1` resources and the CORS fields documented on `VirtualService.corsPolicy`. The EnvoyFilter access-log example is technically plausible but version-sensitive; for production documentation, Istio's Telemetry API access logging may be preferable in newer installations.
