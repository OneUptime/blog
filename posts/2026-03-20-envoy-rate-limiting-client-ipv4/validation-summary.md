# Validation Summary: How to Configure Envoy Rate Limiting Based on Client IPv4 Address

## Status
validated

## Post Type
Guide

## Technologies Covered
- Envoy Proxy
- Envoy HTTP local rate limit filter
- Envoy HTTP global rate limit filter
- Envoy external rate limit service
- X-Forwarded-For trusted client address handling
- YAML configuration

## Sources Consulted
- Envoy HTTP local rate limit filter documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/local_rate_limit_filter
- Envoy HTTP local rate limit proto reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/extensions/filters/http/local_ratelimit/v3/local_rate_limit.proto
- Envoy HTTP rate limit filter documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/rate_limit_filter
- Envoy route components proto reference (`RateLimit.Action.RemoteAddress` and `HeaderValueMatch`): https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/route/v3/route_components.proto.html
- Envoy common rate limit components proto reference (`LocalRateLimitDescriptor`, wildcard descriptor values, X-RateLimit headers): https://www.envoyproxy.io/docs/envoy/latest/api-v3/extensions/common/ratelimit/v3/ratelimit.proto.html
- Envoy HTTP header handling documentation (`x-forwarded-for`, trusted client address, `use_remote_address`): https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_conn_man/headers.html
- Envoy rate limit service documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/other_features/rate_limit.html
- Envoy ratelimit reference implementation repository: https://github.com/envoyproxy/ratelimit

## Issues Found
- The local rate limit example used a route-level `remote_address` action but did not define local descriptors, so it did not actually create separate per-IP local buckets. I added a wildcard `remote_address` descriptor with its own token bucket, disabled default bucket consumption for matching descriptors, and set `max_dynamic_descriptors` so the example now reflects per-IP local rate limiting as documented by Envoy.
- The post treated `remote_address` as a direct client IP key without clarifying that Envoy derives it from trusted client address handling. I added `use_remote_address: true` to the example and clarified in the text/comments that the descriptor depends on Envoy’s trusted client address and XFF processing.
- The response header example used static `X-RateLimit-Limit` and `Retry-After` values as if they were native dynamic rate-limit outputs. I replaced that with `enable_x_ratelimit_headers: DRAFT_VERSION_03` plus a custom response header example, which matches the current Envoy filter APIs.
- The monitoring section used the wrong stats namespace (`http.ingress_http.local_rate_limit.*`). I corrected it to the documented HTTP local rate limit namespace: `<stat_prefix>.http_local_rate_limit.*`.

## Review Notes
- The post is now technically accurate for current Envoy v3 APIs, but `remote_address` behavior still depends on correct trusted proxy configuration. In deployments behind one or more upstream proxies, readers may need to set `xff_num_trusted_hops` or `xff_trusted_cidrs` to make the trusted client address match the original client IP they intend to limit.
