# Validation Summary: How to Configure Response Caching in Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio EnvoyFilter
- Istio VirtualService
- Envoy HTTP cache filter
- Envoy SimpleHttpCache
- Envoy Lua HTTP filter
- Kubernetes kubectl
- HTTP caching semantics

## Sources Consulted
- Envoy HTTP cache filter documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/cache_filter
- Envoy CacheConfig API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/extensions/filters/http/cache/v3/cache.proto
- Envoy SimpleHttpCache API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/extensions/http/cache/simple_http_cache/v3/config.proto
- Envoy Lua filter documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/lua_filter.html
- Envoy Lua API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/extensions/filters/http/lua/v3/lua.proto
- Istio EnvoyFilter reference: https://istio.io/latest/docs/reference/config/networking/envoy-filter/
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio Envoy statistics documentation: https://istio.io/latest/docs/ops/configuration/telemetry/envoy-stats/
- Istio pilot-agent command reference: https://istio.io/latest/docs/reference/commands/pilot-agent/
- RFC 9111 HTTP Caching: https://www.rfc-editor.org/rfc/rfc9111.html
- Envoy source for cache filter behavior and cache lookup statuses: https://github.com/envoyproxy/envoy/tree/main/source/extensions/filters/http/cache

## Issues Found
- The post described Envoy's HTTP cache filter as generally usable without noting its current work-in-progress status. Added an experimental-use caveat because Envoy marks the v3 cache filter and SimpleHttpCache as work-in-progress and not intended for production use.
- The post said only GET and HEAD requests are cached. Updated this to clarify that GET and HEAD can be looked up, but Envoy does not store HEAD responses.
- The post said responses with Set-Cookie are not cached by default. Replaced this with the accurate `no-store` and `private` cache directive behavior; RFC 9111 notes Set-Cookie alone does not inhibit caching.
- The post implied stale cached responses are always served without upstream traffic. Clarified that stale entries are revalidated with upstream before reuse.
- The VirtualService snippets used `networking.istio.io/v1beta1`. Updated them to the current `networking.istio.io/v1` API.
- The Lua EnvoyFilter used deprecated `inline_code`. Updated it to `default_source_code.inline_string`.
- The Lua section claimed the shown filter interacts with Redis. Corrected the wording because the snippet only adds cache metadata and would need an external sidecar or caching proxy for actual external-cache behavior.
- The monitoring section listed non-existent fixed `http.cache.hit_count`, `http.cache.miss_count`, and `http.cache.total_count` counters. Replaced these with Envoy cache lookup statuses exposed through filter state/logging and kept the `pilot-agent request GET stats` command for proxy/backend-specific stats inspection.

## Review Notes
The corrected post is technically accurate as an experimental EnvoyFilter-based approach. EnvoyFilter remains sensitive to Istio and Envoy version changes, so configurations should be revalidated during proxy upgrades.
