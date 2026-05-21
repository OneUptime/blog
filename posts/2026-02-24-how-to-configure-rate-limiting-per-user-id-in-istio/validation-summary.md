# Validation Summary: How to Configure Rate Limiting per User ID in Istio

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Istio RequestAuthentication
- Istio AuthorizationPolicy with CUSTOM external authorization
- Istio EnvoyFilter
- Envoy global rate limit HTTP filter
- Envoy route rate limit actions and descriptors
- Envoy reference rate limit service with Redis
- Kubernetes ConfigMap and kubectl

## Sources Consulted
- Istio RequestAuthentication reference: https://istio.io/latest/docs/reference/config/security/request_authentication/
- Istio Copy JWT Claims to HTTP Headers task: https://istio.io/latest/docs/tasks/security/authentication/claim-to-header/
- Istio External Authorization task: https://istio.io/latest/docs/tasks/security/authorization/authz-custom/
- Istio Enabling Rate Limits using Envoy task: https://istio.io/latest/docs/tasks/policy-enforcement/rate-limit/
- Envoy HTTP rate limit filter documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/rate_limit_filter
- Envoy route rate limit action API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/route/v3/route_components.proto.html
- Envoy reference rate limit service documentation: https://github.com/envoyproxy/ratelimit

## Issues Found
1. The RequestAuthentication example applied in the `default` namespace without a selector, while the rate limit filter runs on the ingress gateway in `istio-system`. Changed it to select the ingress gateway in `istio-system` so the JWT claim header is produced before the gateway rate limit check.
2. The external authorization AuthorizationPolicy had the same scoping problem. Changed it to select the ingress gateway in `istio-system`.
3. The rate limit service cluster was manually added as a STRICT_DNS cluster. Updated the Envoy rate limit filter to use Istio's generated outbound service cluster name with `authority`, matching Istio's documented global rate limit pattern.
4. The tier fallback was unconditional. Because Envoy can evaluate multiple rate limit configurations for the same request, this would also limit tiered users by the fallback. Changed the fallback to use `header_value_match` so it only emits `user_tier=none` when `x-user-tier` is absent, and updated the descriptor examples to match.
5. The anonymous fallback was also unconditional and would have applied to authenticated users. Changed it to emit the anonymous descriptor only when `x-user-id` is absent.
6. Clarified that RequestAuthentication rejects invalid JWTs, while the anonymous fallback is for requests without a JWT.
7. Tightened the filter-order explanation so it refers to the gateway-scoped JWT authentication filter running before the rate limit filter inserted ahead of the router.

## Review Notes
The `outputClaimToHeaders` field is documented by Istio as experimental in the current RequestAuthentication reference. The examples rely on EnvoyFilter, and Istio warns that EnvoyFilter exposes implementation details that can change across upgrades.
