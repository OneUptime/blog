# Validation Summary: How to Implement Retry and Timeout Patterns with Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio
- Envoy
- Kubernetes
- Istio VirtualService
- Istio DestinationRule
- istioctl
- Prometheus metrics

## Sources Consulted
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Envoy router retry header and retry policy documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/router_filter#x-envoy-retry-on
- Envoy retriable status code header documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/router_filter#x-envoy-retriable-status-codes

## Issues Found
- The post used `networking.istio.io/v1beta1` in Istio resource examples. Updated the examples to the current stable `networking.istio.io/v1` API used in current Istio documentation.
- The post described `retries.attempts` as the total number of attempts in several places. Istio defines `attempts` as the number of retries allowed after the initial request, so the maximum number of upstream requests is `1 + attempts`. Updated the explanation and timeout math accordingly.
- The specific status-code retry example said to configure status codes through an `EnvoyFilter`. Istio supports numeric HTTP status codes directly in `retryOn`, so the example was changed to `retryOn: 503,504`. The note about `x-envoy-retriable-status-codes` was kept but clarified as an internal-client/header-based option used with `retryOn: retriable-status-codes`.
- The retry condition descriptions for `5xx` and `gateway-error` omitted Envoy's behavior for upstream disconnects, resets, and read timeouts. Updated those descriptions to match Envoy's documented retry policies.
- The per-route timeout example used `attempts: 1` while describing "no retries." In Istio, `attempts: 1` allows one retry, so it was changed to `attempts: 0`.
- The monitoring examples used `istioctl proxy-config stats`, which is not listed in the current Istio command reference. Updated the commands to `istioctl experimental envoy-stats`, the current documented command for retrieving Envoy-emitted metrics.

## Review Notes
- The examples are intentionally generic service names. If `bank-api` represents an external service rather than a Kubernetes service in the mesh, a real deployment may also need a ServiceEntry or other egress configuration.
