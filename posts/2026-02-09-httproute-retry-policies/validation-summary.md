# Validation Summary: How to implement HTTPRoute retry policies for resilience

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Kubernetes Gateway API
- HTTPRoute
- Envoy Gateway BackendTrafficPolicy
- Kong Gateway / Kong Ingress Controller
- Prometheus Operator ServiceMonitor and PrometheusRule
- PromQL
- Go
- Python Flask
- kubectl and curl

## Sources Consulted
- Kubernetes Gateway API reference specification: https://gateway-api.sigs.k8s.io/reference/spec/
- Kubernetes Gateway API GEP-1731 HTTPRoute Retries: https://gateway-api.sigs.k8s.io/geps/gep-1731/
- Gateway API HTTP header modifier guide: https://gateway-api.sigs.k8s.io/guides/user-guides/http-header-modifier/
- Envoy Gateway retry task documentation: https://gateway.envoyproxy.io/v1.8/tasks/traffic/retry/
- Envoy Gateway BackendTrafficPolicy concept documentation: https://gateway.envoyproxy.io/docs/concepts/gateway_api_extensions/backend-traffic-policy/
- Envoy Gateway API reference for BackendTrafficPolicy, Retry, RetryOn, PerRetryPolicy, BackOffPolicy, CircuitBreaker: https://gateway.envoyproxy.io/v1.8/api/extension_types/
- Kong Ingress Controller annotation reference: https://developer.konghq.com/kubernetes-ingress-controller/reference/annotations/
- Kong Gateway proxying errors and retries documentation: https://developer.konghq.com/gateway/traffic-control/proxying/
- Kong Gateway Service entity documentation: https://developer.konghq.com/gateway/entities/service/
- Kong Gateway PDK service retry reference: https://developer.konghq.com/gateway/pdk/reference/kong.service/

## Issues Found
- The post described Gateway API retry support as if retry fields were broadly stable on HTTPRoute. Updated the introduction to note that HTTPRoute retry is experimental and that implementations may use implementation-specific policy resources.
- Envoy Gateway BackendTrafficPolicy examples used deprecated or incorrect fields: `targetRef`, `perRetryPolicy`, and `backoff`. Updated examples to `targetRefs`, `perRetry`, and `backOff`.
- Envoy Gateway examples listed `httpStatusCodes` without the `retriable-status-codes` trigger. Added the trigger where status-code retries are configured.
- The `retriable-4xx` comment incorrectly said it only covered 429. Updated it to 409 Conflict, matching Envoy Gateway's documented trigger behavior.
- The Kong section claimed an HTTPRoute retry annotation and a generic Retry plugin with `retry_condition`. Replaced this with Service-level `konghq.com/retries` and timeout annotations, and clarified that Kong's built-in retries are for transport-level errors/timeouts rather than upstream 5xx responses.
- The idempotency-key section used `${request_id}` in a standard Gateway API `RequestHeaderModifier`, but the standard filter only defines literal header values. Updated the example to avoid non-portable variable substitution.
- The retry budget example used unsupported `budget`, `maxRetryRatio`, and `minRetryConcurrency` fields in Envoy Gateway BackendTrafficPolicy. Replaced it with `circuitBreaker.maxParallelRetries`.
- The circuit breaker example used incorrect Envoy Gateway field names `maxRequests` and `maxRetries`. Updated them to `maxParallelRequests` and `maxParallelRetries`.
- PromQL examples grouped Envoy metrics by a non-standard `route` label. Updated examples and alerts to group by `envoy_cluster_name`.
- The jitter example used unsupported `jitterPercent`. Updated it to rely on Envoy Gateway's documented fully jittered exponential backoff.
- The troubleshooting curl example used unsupported `X-Envoy-Force-Retry`. Replaced it with a direct request to an endpoint that returns a retriable status code.
- The retry best-practice list implied only GET, HEAD, and OPTIONS are idempotent. Clarified that PUT and DELETE are idempotent by HTTP semantics but still require application-specific review.
- The retry-count formula ignored cumulative exponential backoff delay and recommended 5 retries for a 30 second budget with 1 second base delay. Updated the formula to use cumulative delay and corrected the example to 4 retries.

## Review Notes
Envoy Gateway also supports experimental core HTTPRoute retry fields starting with v1.3, and those take precedence over BackendTrafficPolicy when both are present. The post still focuses mainly on BackendTrafficPolicy examples, which is valid for Envoy Gateway but should be treated as implementation-specific rather than portable Gateway API configuration.
