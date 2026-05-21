# Validation Summary: How to Set Up Request Quotas in Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio EnvoyFilter
- Envoy global rate limit HTTP filter
- Envoy rate limit service
- Redis
- Kubernetes Deployments, Services, ConfigMaps, Namespaces, and volumes
- Envoy Lua HTTP filter
- curl and kubectl

## Sources Consulted
- Istio documentation: Enabling Rate Limits using Envoy - https://istio.io/latest/docs/tasks/policy-enforcement/rate-limit/
- Istio rate limit service sample manifest - https://raw.githubusercontent.com/istio/istio/release-1.30/samples/ratelimit/rate-limit-service.yaml
- Envoy rate limit HTTP filter API - https://www.envoyproxy.io/docs/envoy/latest/api-v3/extensions/filters/http/ratelimit/v3/rate_limit.proto
- Envoy HTTP route rate limit actions API - https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/route/v3/route_components.proto.html
- Envoy Lua HTTP filter documentation - https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/lua_filter
- Istio EnvoyFilter relative operation analyzer - https://istio.io/latest/docs/reference/config/analysis/ist0151/
- envoyproxy/ratelimit configuration documentation - https://github.com/envoyproxy/ratelimit
- Kubernetes volumes documentation - https://kubernetes.io/docs/concepts/storage/volumes/
- Kubernetes PersistentVolumes documentation - https://kubernetes.io/docs/concepts/storage/persistent-volumes/

## Issues Found
- The original quota descriptors limited by `api_tier` only, which would make all clients in the same tier share one bucket. Updated the rate limit service config, Envoy descriptor actions, and Lua filter to include a `client_id` descriptor so quotas are per client within each tier.
- The Redis example used `emptyDir` while saying persistence would survive restarts. Clarified that `emptyDir` survives container crashes but not Pod removal, and recommended a PersistentVolumeClaim or managed Redis for production.
- The Kubernetes examples used the `rate-limit` namespace without creating it. Added a Namespace manifest to the Redis snippet.
- The rate limit service image used the mutable `envoyproxy/ratelimit:master` tag. Replaced it with the commit-pinned tag used by the current Istio sample and added the explicit `/bin/ratelimit` command plus runtime environment settings from the sample.
- The Lua filter used `headers():add()` for derived quota headers, which could leave duplicate client-supplied headers. Changed it to `headers():replace()` for deterministic, trusted descriptor values.
- The Lua and rate limit filters both used relative insertion before the router filter without ordering guidance. Added an EnvoyFilter priority to process the Lua patch first so the quota headers exist before rate limiting runs.
- The sample `x-ratelimit-reset` value showed one hour even though the configured quota window is one day. Updated the example to a day-window reset value.
- The Redis inspection command used `KEYS` and a hardcoded implementation-specific key. Replaced it with `redis-cli --scan` and an explicit placeholder key from the scan output.
- The quota check endpoint example nested a `PATH` descriptor in the rate limit service config, but the EnvoyFilter did not send a `PATH` descriptor and the endpoint would still consume the virtual-host-level quota. Replaced it with a route-level EnvoyFilter pattern that applies rate limits only to routes that should consume quota.

## Review Notes
EnvoyFilter exposes Envoy internals and Istio warns that these details can change across upgrades. The examples are technically valid as an EnvoyFilter-based approach, but production deployments should pin exact Istio/Envoy versions, test EnvoyFilter patches during upgrades, avoid putting raw API keys in quota headers or Redis keys, and use a durable Redis deployment.
