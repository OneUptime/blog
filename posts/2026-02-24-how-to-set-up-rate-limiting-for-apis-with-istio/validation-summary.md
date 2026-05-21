# Validation Summary: How to Set Up Rate Limiting for APIs with Istio

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Istio
- Envoy
- EnvoyFilter
- Kubernetes
- Redis
- Envoy reference rate limit service

## Sources Consulted
- Istio documentation: Enabling Rate Limits using Envoy - https://istio.io/latest/docs/tasks/policy-enforcement/rate-limit/
- Istio documentation: EnvoyFilter reference - https://istio.io/latest/docs/reference/config/networking/envoy-filter/
- Envoy documentation: HTTP local rate limit filter - https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/local_rate_limit_filter
- Envoy documentation: HTTP rate limit filter - https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/rate_limit_filter
- Envoy API reference: HTTP rate limit proto - https://www.envoyproxy.io/docs/envoy/latest/api-v3/extensions/filters/http/ratelimit/v3/rate_limit.proto
- Envoy documentation: Rate limit service - https://www.envoyproxy.io/docs/envoy/latest/configuration/other_features/rate_limit
- Envoy reference rate limit service README - https://github.com/envoyproxy/ratelimit
- Istio sample rate-limit-service manifest - https://raw.githubusercontent.com/istio/istio/master/samples/ratelimit/rate-limit-service.yaml

## Issues Found
- The local rate limit test implied that the first 100 requests would pass in all deployments. Because local rate limiting is enforced per proxy instance, this expectation is only reliable when traffic is sent to a single selected pod. Updated the text to say the test should be run from inside the mesh and that the 100/429 split assumes a single `my-api` pod.
- The path-based global rate limit ConfigMap included a `header_match` descriptor and claimed API-key requests would receive a higher limit, but the EnvoyFilter shown only emitted a `PATH` descriptor. Removed the unused descriptor and the incorrect API-key claim from that example.
- The rate limit service deployment used the floating `envoyproxy/ratelimit:master` image and omitted fields used by the current Istio sample manifest. Updated the image, command, runtime watch settings, host settings, and debug service port to match the official sample more closely.
- The per-client section said the snippet covered API key or IP address limiting, but it only used `request_headers` for an API key. Narrowed the wording to API-key based rate limiting.
- The response-header example used a `%DYNAMIC_METADATA(...)%` formatter for remaining quota, but Envoy only emits rate limit dynamic metadata when the rate limit service returns it. Replaced the snippet with the supported `enable_x_ratelimit_headers: DRAFT_VERSION_03` setting for the global `RateLimit` filter.

## Review Notes
EnvoyFilter exposes internal Envoy configuration and Istio warns that these details can change across upgrades. The tutorial is technically valid after the fixes, but future maintenance should re-check it against the Istio version targeted by the deployment.
