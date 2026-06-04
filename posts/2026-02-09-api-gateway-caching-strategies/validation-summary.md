# Validation Summary: How to Configure API Gateway Caching Strategies for Performance Optimization

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- NGINX and NGINX Plus proxy caching
- Kong Gateway Proxy Cache and Proxy Caching Advanced plugins
- Envoy HTTP cache filter
- Redis
- Kafka consumer-based invalidation
- Flask conditional responses and ETags
- Kubernetes Deployments, Services, and CronJobs
- Prometheus alerting

## Sources Consulted
- NGINX Content Caching documentation: https://docs.nginx.com/nginx/admin-guide/content-cache/content-caching/
- NGINX proxy module reference, including proxy_cache_revalidate: https://nginx.org/en/docs/http/ngx_http_proxy_module.html
- Kong Proxy Cache plugin documentation: https://developer.konghq.com/plugins/proxy-cache/
- Kong Proxy Caching Advanced plugin documentation: https://developer.konghq.com/plugins/proxy-cache-advanced/
- Kong Proxy Caching Advanced Redis example: https://developer.konghq.com/plugins/proxy-cache-advanced/examples/redis-strategy/
- Envoy HTTP cache filter documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/cache_filter
- Envoy CacheConfig API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/extensions/filters/http/cache/v3/cache.proto.html
- Envoy SimpleHttpCacheConfig API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/extensions/http/cache/simple_http_cache/v3/config.proto
- Flask Response API reference: https://flask.palletsprojects.com/en/2.2.x/api/
- MDN ETag reference: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/ETag
- NGINX Plus Prometheus njs module documentation: https://docs.nginx.com/nginx/admin-guide/dynamic-modules/prometheus-njs/

## Issues Found
- Kong Redis examples used the open-source `proxy-cache` plugin, but Redis is supported by `proxy-cache-advanced`. Updated the section title, explanatory text, Admin API command, declarative plugin names, and invalidation endpoint paths.
- Kong Redis configuration used the deprecated `redis.timeout` style. Replaced it with `connect_timeout`, `send_timeout`, and `read_timeout`.
- Envoy `SimpleHttpCacheConfig` included an unsupported `http_cache_config.max_body_bytes` field and an invalid route-level `CacheConfig` without a storage `typed_config`. Removed those fields and added a minimal backend cluster so the static config is coherent.
- Envoy's HTTP cache filter is officially marked work-in-progress and not intended for production use. Added that caveat.
- NGINX purge key used `$request_method`, which would evaluate to `PURGE` and miss entries cached under `GET`. Changed the purge key to use `GET` for the shown GET endpoint and labeled the feature as NGINX Plus.
- Kong event-driven invalidation deleted Redis keys by an assumed internal pattern. Replaced it with the documented Admin API purge endpoint.
- NGINX ETag snippet compared `$http_if_none_match` with `$upstream_http_etag` before the upstream response exists. Replaced it with `proxy_cache_revalidate on`, which is the documented NGINX mechanism for expired cache revalidation using validators.
- Flask ETag example compared a raw header string to an unquoted digest and returned a bare 304. Updated it to use `response.set_etag()` and `request.if_none_match.contains()`, preserving validator headers on 304 responses.
- Prometheus queries referenced non-standard `nginx_http_cache_hit`, `nginx_http_cache_miss`, and `nginx_http_cache_stale` metrics. Reworked the example to explicitly assume a log-derived `nginx_cache_responses_total` counter with a `cache_status` label.

## Review Notes
The Redis Kubernetes example is acceptable for demonstration but uses a single Redis pod with `emptyDir`, so production deployments should use persistent storage and high availability. Envoy cache behavior remains version-sensitive because the filter is still documented as work-in-progress.
