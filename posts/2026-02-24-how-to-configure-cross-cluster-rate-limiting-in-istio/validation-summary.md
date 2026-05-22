# Validation Summary: How to Configure Cross-Cluster Rate Limiting in Istio

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Istio
- EnvoyFilter
- Envoy local rate limit filter
- Envoy global rate limit filter
- Envoy rate limit service
- Kubernetes
- Redis
- Prometheus

## Sources Consulted
- Istio documentation: Enabling Rate Limits using Envoy, https://istio.io/latest/docs/tasks/policy-enforcement/rate-limit/
- Envoy documentation: HTTP rate limit filter, https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/rate_limit_filter
- Envoy documentation: HTTP local rate limit filter, https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/local_rate_limit_filter
- Envoy rate limit service README and configuration docs, https://github.com/envoyproxy/ratelimit
- Kubernetes kubectl apply reference, https://kubernetes.io/docs/reference/kubectl/generated/kubectl_apply/
- Kubernetes kubectl exec reference, https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/

## Issues Found
- The global rate limiting EnvoyFilter inserted the `envoy.filters.http.ratelimit` filter and configured the upstream cluster, but it did not define route-level or virtual-host-level `rate_limits` actions. Envoy only calls the rate limit service when a matching route or virtual host has rate limit configuration, so the original snippet would not generate the `PATH` descriptor used by the rate limit service. Added an `HTTP_ROUTE` patch for the inbound port 8080 virtual host that sends the `:path` header as the `PATH` descriptor and sets the route domain to `production`.
- The global deployment text implied every proxy must call the same Kubernetes Service DNS name across clusters. That only works if the name is resolvable from every cluster, while another valid pattern is deploying rate limit service instances in each cluster backed by the same Redis store. Updated the wording to require either a shared resolvable service address or per-cluster rate limit service instances with a shared Redis backend.

## Review Notes
- The post uses `EnvoyFilter`, which Istio documents as exposing Envoy internals that can change across upgrades. This is technically correct for rate limiting examples, but future revisions should mention upgrade testing.
- The local rate limit metrics query assumes the relevant Envoy stats are exposed to Prometheus. Istio's rate-limit documentation notes that some local rate limit stats may need `proxyStatsMatcher` configuration.
