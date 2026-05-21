# Validation Summary: How to Configure Rate Limiting with EnvoyFilter

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio
- EnvoyFilter
- Envoy local rate limiting
- Envoy global rate limiting
- Envoy rate limit service
- Kubernetes
- Redis
- kubectl

## Sources Consulted
- Istio documentation: Enabling Rate Limits using Envoy - https://istio.io/latest/docs/tasks/policy-enforcement/rate-limit/
- Istio documentation: EnvoyFilter reference - https://istio.io/latest/docs/reference/config/networking/envoy-filter/
- Envoy documentation: HTTP local rate limit filter - https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/local_rate_limit_filter
- Envoy documentation: HTTP rate limit filter - https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/rate_limit_filter
- Envoy proxy ratelimit service documentation - https://github.com/envoyproxy/ratelimit
- Istio sample rate limit service manifest - https://raw.githubusercontent.com/istio/istio/master/samples/ratelimit/rate-limit-service.yaml

## Issues Found
- The per-route local rate limit example matched a route named `default`, which is not a reliable Istio-generated inbound route name. Updated the match to use the documented inbound virtual host pattern with `name: "inbound|http|8080"` and `route.action: ANY`.
- The global rate limit service deployment referenced `redis.rate-limit.svc.cluster.local:6379` but did not deploy a Redis Service or Deployment. Added Redis resources to the deployment snippet.
- The global rate limit service used the floating `envoyproxy/ratelimit:master` image. Replaced it with the pinned `envoyproxy/ratelimit:30a4ce1a` image used by the current Istio sample manifest.
- The global EnvoyFilter installed `envoy.filters.http.ratelimit` but did not configure any virtual host or route `rate_limits` actions. Envoy only calls the rate limit service when matching route or virtual-host rate limit configuration exists, so the example would not enforce limits as written. Added a `VIRTUAL_HOST` patch that generates `PATH` descriptors from the `:path` header.

## Review Notes
- EnvoyFilter exposes Envoy internals and should be retested during Istio proxy upgrades, as noted in the Istio EnvoyFilter documentation.
- The examples are intentionally generic. In a real deployment, the inbound virtual host name and service port should match the target workload, and global rate limiting should usually be scoped with a `workloadSelector` instead of applying broadly from the root namespace.
