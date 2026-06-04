# Validation Summary: How to Use Rate Limiting with Istio Using Local and Global Rate Limit Filters

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio EnvoyFilter
- Envoy HTTP local rate limit filter
- Envoy HTTP global rate limit filter
- Envoy rate limit service
- Redis
- Kubernetes manifests
- Prometheus / PrometheusRule

## Sources Consulted
- Istio official task: Enabling Rate Limits using Envoy: https://istio.io/latest/docs/tasks/policy-enforcement/rate-limit/
- Istio official reference: EnvoyFilter: https://istio.io/latest/docs/reference/config/networking/envoy-filter/
- Envoy official docs: HTTP local rate limit filter: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/local_rate_limit_filter
- Envoy official docs: HTTP rate limit filter: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/rate_limit_filter
- Envoy official API reference: route rate limit actions: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/route/v3/route_components.proto.html
- Envoy rate limit service reference implementation: https://github.com/envoyproxy/ratelimit

## Issues Found
- The local rate limit examples used the deprecated `append: false` field for response headers. Updated it to `append_action: OVERWRITE_IF_EXISTS_OR_ADD`, matching current Envoy `HeaderValueOption` usage.
- The per-route local rate limiting example configured route-level rate-limit actions without first inserting the local rate-limit HTTP filter. Added the required HTTP filter patch.
- The per-route local rate limiting example used a `header_value_match` action that did not map to a local descriptor bucket. Added a matching `descriptor_key` and descriptor-specific token bucket so the high-priority route limit can be applied.
- The global rate-limit service ConfigMap did not include a descriptor for the later `path_match` action. Added the matching descriptor.
- The rate-limit service deployment mounted config at `/data/ratelimit/config` but did not explicitly set `RUNTIME_APPDIRECTORY`. Added `RUNTIME_APPDIRECTORY=config` to make the runtime config path match the mount.
- One `EnvoyFilter` example used `networking.istio.io/v1beta1`. Updated it to `networking.istio.io/v1alpha3`, which is the API version used by current Istio EnvoyFilter documentation.
- The unauthenticated user fallback descriptor was never referenced by the user-based EnvoyFilter. Added a `header_value_match` action that emits the `anonymous` descriptor only when `x-user-id` is absent.
- The combined local/global EnvoyFilter example inserted filters without router sub-filter matching and omitted the global rate-limit cluster definition. Added router-relative matches, `transport_api_version: V3`, and the `rate_limit_cluster` patch.
- The Prometheus local rate-limit metric name did not include the configured Envoy `stat_prefix`. Updated the query and alert expression to use `envoy_http_local_rate_limiter_http_local_rate_limit_rate_limited`.

## Review Notes
- EnvoyFilter exposes Envoy internals, and Istio notes that these configurations should be monitored carefully across proxy upgrades.
- Envoy local rate-limit statistics are disabled by default in many Istio deployments unless proxy stats matching is configured to include them.
- The `envoyproxy/ratelimit:latest` image is valid for examples, but production deployments should pin an image digest or commit-based tag.
