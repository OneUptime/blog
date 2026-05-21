# Validation Summary: How to Debug Why Retries Are Not Working in Istio

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Istio VirtualService
- Istio DestinationRule
- Istio fault injection
- Envoy retry policies and retry circuit breakers
- Kubernetes kubectl
- istioctl proxy configuration inspection

## Sources Consulted
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio traffic management concepts: https://istio.io/latest/docs/concepts/traffic-management/
- Envoy router filter retry policy documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/router_filter
- Envoy route RetryPolicy API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/route/v3/route_components.proto.html

## Issues Found
- The post attributed Istio's default two HTTP retries to Envoy. Envoy does not retry by default unless configured, while Istio configures default HTTP retries. Updated the wording.
- The examples used `networking.istio.io/v1beta1`. Updated the Istio resources to the current `networking.istio.io/v1` API used by official docs.
- The custom status-code retry example used a non-Istio field, `retriableStatusCodes`, and then incorrectly said custom status codes require headers or EnvoyFilter. Updated the example to use Istio's supported `retryOn: "503,429"` style and clarified destination-response matching.
- The idempotency section incorrectly described Envoy as retrying only safe requests by default. Reworded it to explain that retries follow the configured policy and can duplicate non-idempotent operations.
- The timeout math treated `attempts` as total tries. Istio defines `attempts` as retries after the initial request, so the maximum request count is `1 + attempts`. Updated the formulas and examples.
- The post said the route timeout defaults to 15 seconds. Current Istio VirtualService docs say the HTTP route `timeout` field is disabled by default. Corrected that claim.
- The retry-budget section only showed `connectionPool.http.maxRetries`, while current Istio exposes `trafficPolicy.retryBudget` with `percent` and `minRetryConcurrency`. Updated the DestinationRule example and kept `maxRetries` as the older outstanding-retry circuit breaker.
- The fault-injection test combined fault injection and retry policy in one VirtualService, but Istio docs state fault injection cannot be combined with retry or timeout configuration on the same virtual service. Replaced that test with controlled backend failures.

## Review Notes
The CLI inspection commands are plausible for Istio sidecar troubleshooting, but exact JSON shapes can vary by Istio/Envoy version and whether `istioctl proxy-config` returns a config dump or route list. The post now avoids relying on invalid Istio API fields.
