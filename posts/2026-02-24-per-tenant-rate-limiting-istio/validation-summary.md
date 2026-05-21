# Validation Summary: How to Configure Per-Tenant Rate Limiting in Istio

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Istio EnvoyFilter
- Envoy HTTP local rate limit filter
- Envoy HTTP global rate limit filter
- Envoy reference ratelimit service
- Kubernetes Deployments, Services, and ConfigMaps
- Redis
- Prometheus metrics
- kubectl and istioctl

## Sources Consulted
- Istio task documentation: Enabling Rate Limits using Envoy - https://istio.io/latest/docs/tasks/policy-enforcement/rate-limit/
- Istio EnvoyFilter reference - https://istio.io/latest/docs/reference/config/networking/envoy-filter/
- Istio istioctl command reference - https://istio.io/latest/docs/reference/commands/istioctl/
- Envoy HTTP local rate limit filter documentation - https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/local_rate_limit_filter
- Envoy HTTP rate limit filter documentation - https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/rate_limit_filter
- Envoy reference ratelimit service documentation - https://github.com/envoyproxy/ratelimit
- Istio ratelimit sample manifest - https://raw.githubusercontent.com/istio/istio/master/samples/ratelimit/rate-limit-service.yaml

## Issues Found
- The local rate limit EnvoyFilter was described as header-based but actually applied a blanket local token bucket. I changed the wording to say it applies to the shared API workload.
- The local and global rate limit EnvoyFilters were either in the root namespace without selectors or used a cluster patch match that was not appropriate for an added cluster. I scoped the filters to `shared-services` with `workloadSelector` for `app: shared-api` and removed the invalid cluster match from the `ADD` patch.
- The post implied namespace tenancy could be directly extracted from mTLS metadata as a rate limit descriptor. I changed this to recommend a trusted identity signal or application-controlled header, avoiding an over-specific and unsafe claim.
- The ratelimit Deployment used `envoyproxy/ratelimit:latest`. The upstream project documents commit-SHA image tags rather than stable version tags, so I switched the example to the current Istio sample image tag and command.
- The ratelimit service metrics instructions used port `8080` and `/stats` as a Prometheus endpoint. The upstream service exposes Prometheus metrics only when `USE_PROMETHEUS` is enabled, defaulting to `:9090/metrics`, so I added the required environment variables, service port, and corrected the curl command.
- The test sent only 200 requests for `tenant-a`, whose configured limit was 1000 requests per minute, so the example would not hit the limit. I changed it to send 120 requests for an unknown tenant, which uses the configured 100 requests per minute default.
- The Envoy stats command used `istioctl proxy-config stats`, which is not documented in the current Istio command reference. I replaced it with `istioctl experimental envoy-stats` and corrected the stat name guidance.

## Review Notes
EnvoyFilter patches expose Envoy internals and should be rechecked when upgrading Istio or Envoy. Istio may not emit every custom Envoy stat unless matching stats are enabled with `proxyStatsMatcher`.
