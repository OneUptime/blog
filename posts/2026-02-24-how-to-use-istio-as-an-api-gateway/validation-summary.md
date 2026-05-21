# Validation Summary: How to Use Istio as an API Gateway

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio Gateway and VirtualService
- Istio RequestAuthentication and AuthorizationPolicy
- Istio EnvoyFilter
- Envoy local rate limiting
- Kubernetes TLS secrets
- Prometheus queries for Istio metrics

## Sources Consulted
- Istio Gateway reference: https://istio.io/latest/docs/reference/config/networking/gateway/
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio RequestAuthentication reference: https://istio.io/latest/docs/reference/config/security/request_authentication/
- Istio AuthorizationPolicy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio authorization policy conditions: https://istio.io/latest/docs/reference/config/security/conditions/
- Istio rate limiting with Envoy: https://istio.io/latest/docs/tasks/policy-enforcement/rate-limit/
- Istio standard metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- Istio querying metrics from Prometheus: https://istio.io/latest/docs/tasks/observability/metrics/querying-metrics/
- Kubernetes kubectl create secret tls reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_tls/
- Envoy local rate limit filter reference: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/local_rate_limit_filter

## Issues Found
- The JWT authentication section said RequestAuthentication ensures only authenticated requests reach services. Istio RequestAuthentication rejects invalid JWTs, but requests without credentials are accepted unless an AuthorizationPolicy requires authentication. Updated the wording to make that behavior clear.
- The local rate limiting EnvoyFilter configured a token bucket but did not explicitly enable and enforce the local rate limit filter. Envoy's runtime defaults for HTTP local rate limit checking and enforcement are 0%, so the example could fail to apply limits. Added `filter_enabled` and `filter_enforced` with 100% defaults.
- The rate limiting explanation described a gateway-wide 500 requests per minute limit. Envoy local rate limiting is per proxy process, so this is per gateway proxy instance. Updated the explanation.
- The Prometheus examples used `reporter="destination"` with `destination_service_name="istio-ingressgateway"` and grouped by `request_url_path`, which is not a standard Istio metric label. Updated the queries to select gateway source metrics using standard labels and group request rate by `destination_service`.

## Review Notes
- The Gateway, VirtualService routing, path rewrite, CORS, timeout, retry, header matching, JWT forwarding, claim-based AuthorizationPolicy, Kubernetes TLS secret command, and EnvoyFilter API versions are consistent with current official documentation.
- Istio notes that EnvoyFilter exposes implementation details that may change across upgrades, so production configurations should be tested when upgrading Istio or Envoy.
