# Validation Summary: How to Configure API Rate Limiting by Consumer in Istio

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Istio
- Envoy HTTP rate limit filter
- Envoy rate limit service
- Kubernetes Deployments, Services, and ConfigMaps
- Redis
- Istio EnvoyFilter
- Istio RequestAuthentication
- curl
- kubectl

## Sources Consulted
- Istio documentation: Enabling Rate Limits using Envoy, https://istio.io/latest/docs/tasks/policy-enforcement/rate-limit/
- Istio documentation: EnvoyFilter reference, https://istio.io/latest/docs/reference/config/networking/envoy-filter/
- Istio documentation: RequestAuthentication reference, https://istio.io/latest/docs/reference/config/security/request_authentication/
- Istio documentation: Copy JWT Claims to HTTP Headers, https://istio.io/latest/docs/tasks/security/authentication/claim-to-header/
- Envoy documentation: HTTP rate limit filter, https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/rate_limit_filter
- Envoy documentation: RateLimit v3 API reference, https://www.envoyproxy.io/docs/envoy/latest/api-v3/extensions/filters/http/ratelimit/v3/rate_limit.proto
- Envoy documentation: Route rate limit actions, https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/route/v3/route_components.proto.html
- Envoy rate limit service README, https://github.com/envoyproxy/ratelimit
- Kubernetes documentation: kubectl logs, https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands#logs

## Issues Found
- The post showed a custom Envoy cluster EnvoyFilter before adding the HTTP rate limit filter. Istio's official rate-limit task uses the generated outbound service cluster for the Kubernetes Service, so the example was changed to point `cluster_name` at `outbound|8081||ratelimit.istio-system.svc.cluster.local`.
- The post said the key-only descriptor was a default for unidentified consumers. Envoy's `request_headers` action does not generate a descriptor when the header is absent, so the wording was corrected to "unrecognized tier values" and a note was added that the authentication layer must set the header for every request that should be rate limited.
- The post said Envoy adds `X-RateLimit-*` response headers by default. Envoy's v3 API has these headers disabled by default, so `enable_x_ratelimit_headers: DRAFT_VERSION_03` was added to the filter example and the explanation was updated.
- The post said `failure_mode_deny: true` denies all requests when the rate limit service is down. Envoy actually fails closed with the configured error status, defaulting to 500, so the explanation was corrected.

## Review Notes
The remaining examples are version-sensitive because Istio warns that EnvoyFilter exposes internal implementation details that can change across upgrades. The examples are consistent with current Istio and Envoy v3 documentation, but production deployments should pin container image versions instead of using `envoyproxy/ratelimit:latest`.
