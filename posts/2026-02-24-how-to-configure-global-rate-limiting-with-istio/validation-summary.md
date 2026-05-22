# Validation Summary: How to Configure Global Rate Limiting with Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio EnvoyFilter
- Envoy HTTP global rate limit filter
- Envoy rate limit service
- Redis
- Kubernetes Deployments, Services, ConfigMaps, and kubectl

## Sources Consulted
- Istio documentation: Enabling Rate Limits using Envoy - https://istio.io/latest/docs/tasks/policy-enforcement/rate-limit/
- Istio documentation: EnvoyFilter reference - https://istio.io/latest/docs/reference/config/networking/envoy-filter/
- Envoy documentation: HTTP rate limit filter proto - https://www.envoyproxy.io/docs/envoy/latest/api-v3/extensions/filters/http/ratelimit/v3/rate_limit.proto
- Envoy documentation: Global rate limiting architecture overview - https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/other_features/global_rate_limiting.html
- Envoy documentation: Route rate limit actions and HeaderMatcher fields - https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/route/v3/route_components.proto.html
- Envoy rate limit service README and configuration reference - https://github.com/envoyproxy/ratelimit

## Issues Found
- The post claimed a global limit gives "exactly" the configured request count regardless of pod count. I changed this to say the limit is shared across configured proxies, which matches Envoy's global rate limit model without overstating runtime precision.
- The ConfigMap included API tier descriptors, but the EnvoyFilter only generated a `PATH` descriptor. I added `header_value_match` actions for `x-api-tier: free` and `x-api-tier: premium` so the tier rules are actually sent to the rate limit service.
- The rate limit service deployment relied on the default runtime app directory. I added `RUNTIME_APPDIRECTORY=config` to match the mounted `/data/ratelimit/config` path explicitly.
- The post said the rate limit service reads configuration only on startup and therefore requires restart. I changed this to note that file-based configuration can reload, while a rollout restart is a simple way to ensure every replica has the updated ConfigMap.
- The monitoring section described port 6070 as a metrics port. I corrected it to describe the debug endpoints, including `/stats` and `/rlconfig`, which is how the Envoy rate limit service exposes that information.

## Review Notes
- The examples use EnvoyFilter, which Istio documents as exposing Envoy internals that can change across proxy upgrades. The post is technically valid, but readers should test these filters when upgrading Istio or Envoy.
- The `envoyproxy/ratelimit:master` image is usable for examples, but production deployments should pin to a specific immutable image tag or digest.
