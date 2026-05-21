# Validation Summary: How to Set Up API Rate Limiting with Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio
- EnvoyFilter
- Envoy local rate limit filter
- Envoy global rate limit filter
- Envoy reference rate limit service
- Kubernetes Deployments, Services, and ConfigMaps
- Redis
- Prometheus / PromQL
- kubectl

## Sources Consulted
- Istio: Enabling Rate Limits using Envoy - https://istio.io/latest/docs/tasks/policy-enforcement/rate-limit/
- Envoy: HTTP local rate limit filter - https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/local_rate_limit_filter
- Envoy: HTTP rate limit filter - https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/rate_limit_filter
- Envoy: route rate limit actions and header matchers - https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/route/v3/route_components.proto.html
- Envoy reference rate limit service - https://github.com/envoyproxy/ratelimit
- Kubernetes kubectl logs reference - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Prometheus querying basics - https://prometheus.io/docs/prometheus/latest/querying/basics/

## Issues Found
- The global rate limit EnvoyFilter manually added a STRICT_DNS cluster for the rate limit service. Istio's documented pattern uses the generated outbound service cluster, so the snippet was changed to `outbound|8081||ratelimit.istio-system.svc.cluster.local` with an authority override.
- The ConfigMap defined `path-users` and `path-orders` descriptors, but the EnvoyFilter never generated those descriptors. Added `:path` header match actions using current `string_match` syntax.
- The default global rate limit action was unconditional, so it would also apply alongside API-key traffic. Updated it to match only requests without `x-api-key` and outside the shown `/v1/users` and `/v1/orders` path prefixes.
- The local rate limit response header explanation implied dynamic limit metadata. Envoy's configured `response_headers_to_add` adds a static header on rate-limited responses, so the explanation was corrected.
- The Prometheus metric names did not match Envoy's stat namespaces for local and global rate limiting. Updated the examples to include the local filter `stat_prefix` namespace and the global cluster ratelimit namespace, and fixed the alert query to use PromQL's `__name__` regex matcher.
- The monitoring section omitted Istio's caveat that relevant Envoy stats may need to be enabled with `proxyStatsMatcher`. Added that note.

## Review Notes
The post remains version-sensitive because `EnvoyFilter` exposes Envoy internals that Istio warns can change across upgrades. The rate limit service image tag `master` is usable for examples but should be pinned to a tested release or digest in production.
