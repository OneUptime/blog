# Validation Summary: How to Set Up API Consumer Portal with Istio

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Istio Gateway and VirtualService
- Istio RequestAuthentication and AuthorizationPolicy
- Istio PeerAuthentication and mTLS
- Istio EnvoyFilter
- Envoy Lua and local rate limiting filters
- Kubernetes Deployment, Service, ConfigMap, and Secret references
- Prometheus and PromQL
- Swagger UI / Redoc API documentation services

## Sources Consulted
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio Gateway reference: https://istio.io/latest/docs/reference/config/networking/gateway/
- Istio RequestAuthentication reference: https://istio.io/latest/docs/reference/config/security/request_authentication/
- Istio AuthorizationPolicy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio PeerAuthentication reference: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Istio EnvoyFilter reference: https://istio.io/latest/docs/reference/config/networking/envoy-filter/
- Istio rate limiting with Envoy task: https://istio.io/latest/docs/tasks/policy-enforcement/rate-limit/
- Istio standard metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- Istio Telemetry API metrics customization task: https://istio.io/latest/docs/tasks/observability/metrics/customize-metrics/
- Envoy Lua filter documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/lua_filter
- Kubernetes ConfigMap documentation: https://kubernetes.io/docs/concepts/configuration/configmap/
- Kubernetes Secret documentation: https://kubernetes.io/docs/concepts/configuration/secret/

## Issues Found
- Istio's default Prometheus metrics do not include an `x_client_id` label. Updated the analytics section to state that this label must be added with Istio Telemetry from a trusted client identifier before the PromQL examples produce per-client results.
- The public AuthorizationPolicy allowed `/`, `/static/*`, `/assets/*`, and `/portal/docs*`, but not the portal frontend path itself. Added `/portal*` so the catch-all frontend route can be accessed as described.
- The rate-limit visibility section claimed to expose current quota status, but the Lua example only exposes a tier limit. Updated the wording to describe tier information and changed Lua header writes from `add` to `replace` to avoid duplicate `x-ratelimit-limit` values.
- The local rate-limit EnvoyFilter inserted an HTTP filter without the router subfilter match used in Istio's documented examples. Added the HTTP connection manager and router subfilter match so insertion occurs before the router filter.

## Review Notes
The examples are illustrative and assume supporting services such as `swagger-ui`, `portal-api`, `status-service`, authentication, and key-management backends exist. EnvoyFilter remains an advanced Istio escape hatch; production deployments should test these filters against the exact Istio/Envoy version in use.
