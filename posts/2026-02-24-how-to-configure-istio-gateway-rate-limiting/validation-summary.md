# Validation Summary: How to Configure Istio Gateway Rate Limiting

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

## Sources Consulted
- Istio documentation: Enabling Rate Limits using Envoy - https://istio.io/latest/docs/tasks/policy-enforcement/rate-limit/
- Istio documentation: EnvoyFilter reference - https://istio.io/latest/docs/reference/config/networking/envoy-filter/
- Envoy documentation: HTTP local rate limit filter - https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/local_rate_limit_filter
- Envoy documentation: HTTP rate limit filter - https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/rate_limit_filter
- Envoy documentation: route rate limit actions - https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/route/v3/route_components.proto
- Envoy rate limit service README - https://github.com/envoyproxy/ratelimit
- Istio sample rate limit service manifest - https://raw.githubusercontent.com/istio/istio/master/samples/ratelimit/rate-limit-service.yaml

## Issues Found
- The local/global comparison and Mermaid diagram used 100 RPS, while the examples use `fill_interval: 60s` and `unit: minute`. Changed the wording and diagram labels to requests per minute so the explanation matches the configuration.
- The local rate limit header description implied the custom header is added whenever rate limiting is active. Envoy adds configured response headers to locally rate-limited responses. Updated the wording accordingly.
- The rate limit service deployment used `envoyproxy/ratelimit:master`, which does not match current Envoy rate limit service image guidance. Replaced it with the pinned image used by the current Istio sample, added the `/bin/ratelimit` command, and included the file-watch environment settings used by the sample.
- The global rate limit EnvoyFilter added a custom cluster named `rate_limit_cluster`. Current Istio examples use the Istio-generated outbound cluster for the Kubernetes service. Updated the filter to use `outbound|8081||ratelimit.istio-system.svc.cluster.local` with the service authority and removed the custom cluster patch.
- The rate limit action explanation called `remote_address` the client IP. Envoy's `remote_address` action uses Envoy's trusted remote address behavior, often derived from X-Forwarded-For depending on gateway trust configuration. Updated the wording to avoid overstating it.
- The monitoring section omitted Istio's requirement to enable local rate limit stats with `proxyStatsMatcher`. Added the needed gateway annotation snippet before the stats command.

## Review Notes
- EnvoyFilter is powerful but version-sensitive, and Istio explicitly warns that it exposes internal implementation details that may change during upgrades.
- The snippets are syntactically valid YAML, but exact virtual host and route names such as `api.example.com:80` and `api-route` still depend on the user's actual Gateway and VirtualService configuration.
