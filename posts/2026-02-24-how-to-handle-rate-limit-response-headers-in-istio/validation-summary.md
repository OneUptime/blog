# Validation Summary: How to Handle Rate Limit Response Headers in Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio EnvoyFilter
- Envoy global rate limit filter
- Envoy local rate limit filter
- Envoy rate limit service protocol
- HTTP rate limit response headers
- Envoy Lua HTTP filter
- Python requests
- curl

## Sources Consulted
- Istio documentation: Enabling Rate Limits using Envoy - https://istio.io/latest/docs/tasks/policy-enforcement/rate-limit/
- Istio documentation: EnvoyFilter API reference - https://istio.io/latest/docs/reference/config/networking/envoy-filter/
- Envoy documentation: HTTP rate limit filter API - https://www.envoyproxy.io/docs/envoy/latest/api-v3/extensions/filters/http/ratelimit/v3/rate_limit.proto
- Envoy documentation: HTTP local rate limit filter API - https://www.envoyproxy.io/docs/envoy/latest/api-v3/extensions/filters/http/local_ratelimit/v3/local_rate_limit.proto
- Envoy documentation: Rate limit service API - https://www.envoyproxy.io/docs/envoy/latest/api-v3/service/ratelimit/v3/rls.proto
- Envoy documentation: Lua HTTP filter - https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/lua_filter
- Envoy documentation: Local reply modification - https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_conn_man/local_reply.html
- RFC 6585: Additional HTTP Status Codes - https://www.rfc-editor.org/rfc/rfc6585.html
- IETF draft: RateLimit header fields for HTTP - https://www.ietf.org/archive/id/draft-ietf-httpapi-ratelimit-headers-08.html

## Issues Found
- The post described RFC 6585 as part of the standard for `RateLimit-Limit`, `RateLimit-Remaining`, and `RateLimit-Reset`. RFC 6585 defines `429 Too Many Requests` and permits `Retry-After`; it does not define those rate limit header fields. Updated the wording to distinguish RFC 6585 from the IETF rate limit header drafts.
- The post claimed local rate limiting could only use static response headers and could not dynamically populate remaining count or reset time through configuration. Current Envoy local rate limiting supports `enable_x_ratelimit_headers`, so the local configuration and explanation were updated to use that field for standard `X-RateLimit-*` headers.
- The post said `Retry-After` is included automatically with `DRAFT_VERSION_03`. Envoy documents `DRAFT_VERSION_03` as enabling `X-RateLimit-Limit`, `X-RateLimit-Remaining`, and `X-RateLimit-Reset`; `Retry-After` must be supplied separately, such as by the rate limit service response or `response_headers_to_add`. Updated the text accordingly.
- The rate-limited response example implied `Retry-After` was present just from `DRAFT_VERSION_03`. Updated the lead-in to say it appears when `Retry-After` is also configured.
- The custom response body section said to use a local reply config but showed a Lua response filter. Updated the text to accurately describe the shown approach.

## Review Notes
The examples rely on EnvoyFilter, which Istio documents as exposing internal Envoy implementation details that can change across proxy upgrades. The snippets should be tested against the deployed Istio/Envoy version before production use.
