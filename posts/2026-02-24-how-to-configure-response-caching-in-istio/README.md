# How to Configure Response Caching in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Caching, Performance, Kubernetes, Envoy

Description: A hands-on guide to configuring HTTP response caching in Istio using Envoy's built-in cache filter to reduce backend load and improve response times.

---

Caching HTTP responses at the proxy level can dramatically reduce the load on your backend services and speed up response times for your clients. Instead of every request hitting your application servers, Envoy can serve cached responses for requests that have already been seen. Istio does not have a first-class caching configuration, but since it runs Envoy under the hood, you can tap into Envoy's HTTP cache filter through EnvoyFilter resources. Envoy currently marks the cache filter as work-in-progress and not intended for production use, so treat this setup as experimental and test it carefully before relying on it.

This guide covers how to set up response caching in Istio, from basic configuration to cache control strategies.

## How Envoy Response Caching Works

Envoy includes an HTTP cache filter that follows standard HTTP caching semantics (RFC 7234). It respects Cache-Control headers, ETag, and Last-Modified headers from your backend services. When a cacheable response is received, Envoy stores it and serves fresh cached responses directly for subsequent matching requests. Stale cached responses are revalidated with the upstream service before reuse.

The cache filter operates based on these rules:
- GET and HEAD requests can be looked up by the cache, but Envoy does not store HEAD responses
- The response must include appropriate caching headers (Cache-Control, Expires)
- Responses with `no-store` or `private` cache directives are not stored
- The cache key is based on the request URL, and `Vary` headers are honored only when they match the filter's allowed vary header configuration

## Basic Cache Configuration

To enable response caching, you need to add the HTTP cache filter to the Envoy filter chain using an EnvoyFilter resource:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: response-cache
  namespace: default
spec:
  workloadSelector:
    labels:
      app: my-client
  configPatches:
    - applyTo: HTTP_FILTER
      match:
        context: SIDECAR_OUTBOUND
        listener:
          filterChain:
            filter:
              name: envoy.filters.network.http_connection_manager
              subFilter:
                name: envoy.filters.http.router
      patch:
        operation: INSERT_BEFORE
        value:
          name: envoy.filters.http.cache
          typed_config:
            "@type": type.googleapis.com/envoy.extensions.filters.http.cache.v3.CacheConfig
            typed_config:
              "@type": type.googleapis.com/envoy.extensions.http.cache.simple_http_cache.v3.SimpleHttpCacheConfig
```

This installs the cache filter on the outbound side of the sidecar for pods labeled `app: my-client`. Any responses from upstream services that include proper caching headers will be cached locally in the Envoy proxy's memory.

## Making Your Services Cache-Friendly

The cache filter only works when your backend services send appropriate HTTP caching headers. If your services do not already include these headers, you have two options: modify your application code or add headers through Istio.

To add caching headers through Istio, use a VirtualService:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: add-cache-headers
  namespace: default
spec:
  hosts:
    - catalog-service.default.svc.cluster.local
  http:
    - match:
        - uri:
            prefix: /api/products
      route:
        - destination:
            host: catalog-service.default.svc.cluster.local
      headers:
        response:
          set:
            cache-control: "public, max-age=300"
```

This adds a `Cache-Control: public, max-age=300` header to all responses from the `/api/products` endpoint, telling Envoy (and any other HTTP cache) to cache the response for 5 minutes.

For different endpoints, you might want different cache durations:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: tiered-caching
  namespace: default
spec:
  hosts:
    - catalog-service.default.svc.cluster.local
  http:
    - match:
        - uri:
            prefix: /api/static-content
      route:
        - destination:
            host: catalog-service.default.svc.cluster.local
      headers:
        response:
          set:
            cache-control: "public, max-age=86400"
    - match:
        - uri:
            prefix: /api/products
      route:
        - destination:
            host: catalog-service.default.svc.cluster.local
      headers:
        response:
          set:
            cache-control: "public, max-age=300"
    - match:
        - uri:
            prefix: /api/user
      route:
        - destination:
            host: catalog-service.default.svc.cluster.local
      headers:
        response:
          set:
            cache-control: "private, no-store"
```

Static content gets cached for 24 hours, product listings for 5 minutes, and user-specific endpoints are never cached.

## Caching at the Ingress Gateway

You can also enable caching at the Istio ingress gateway to serve cached responses for external clients. This is particularly useful for public APIs with high read traffic:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: gateway-cache
  namespace: istio-system
spec:
  workloadSelector:
    labels:
      istio: ingressgateway
  configPatches:
    - applyTo: HTTP_FILTER
      match:
        context: GATEWAY
        listener:
          filterChain:
            filter:
              name: envoy.filters.network.http_connection_manager
              subFilter:
                name: envoy.filters.http.router
      patch:
        operation: INSERT_BEFORE
        value:
          name: envoy.filters.http.cache
          typed_config:
            "@type": type.googleapis.com/envoy.extensions.filters.http.cache.v3.CacheConfig
            typed_config:
              "@type": type.googleapis.com/envoy.extensions.http.cache.simple_http_cache.v3.SimpleHttpCacheConfig
```

## Using an External Cache with Lua

The built-in SimpleHttpCache stores data in Envoy's process memory, which means it is not shared across Envoy instances and gets lost on restart. It is also marked as work-in-progress by Envoy. For a more robust caching solution, you can use a Lua filter to add cache metadata that an external caching sidecar or dedicated caching proxy can use:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: redis-cache-filter
  namespace: default
spec:
  workloadSelector:
    labels:
      app: api-gateway
  configPatches:
    - applyTo: HTTP_FILTER
      match:
        context: SIDECAR_OUTBOUND
        listener:
          filterChain:
            filter:
              name: envoy.filters.network.http_connection_manager
              subFilter:
                name: envoy.filters.http.router
      patch:
        operation: INSERT_BEFORE
        value:
          name: envoy.lua
          typed_config:
            "@type": type.googleapis.com/envoy.extensions.filters.http.lua.v3.Lua
            default_source_code:
              inline_string: |
                function envoy_on_request(request_handle)
                  local method = request_handle:headers():get(":method")
                  if method ~= "GET" then
                    return
                  end
                  local path = request_handle:headers():get(":path")
                  request_handle:headers():add("x-cache-key", path)
                end

                function envoy_on_response(response_handle)
                  local cache_control = response_handle:headers():get("cache-control")
                  if cache_control and string.find(cache_control, "public") then
                    response_handle:headers():add("x-cache-status", "MISS")
                  end
                end
```

For a full external caching solution, you would pair this with a caching sidecar container in your pod or use a dedicated caching proxy.

## Cache Invalidation Strategies

Cache invalidation is one of the hard problems in computer science, and it does not get easier in a service mesh. Here are some practical strategies:

**Time-based expiration**: Use `max-age` in your Cache-Control headers. This is the simplest approach and works well for data that changes on a predictable schedule.

**Version-based URLs**: Include a version identifier in your URL paths (like `/api/v2/products` or `/api/products?v=abc123`). When the data changes, update the version, and clients automatically get fresh data.

**Purge through restart**: If you need to invalidate all cached data, you can restart the Envoy proxies. This is heavy-handed but effective for the built-in memory cache:

```bash
kubectl rollout restart deployment/my-client
```

## Monitoring Cache Performance

To see if caching is actually helping, check the Envoy proxy output and any cache backend-specific statistics:

```bash
kubectl exec -it deploy/my-client -c istio-proxy -- \
  pilot-agent request GET stats | grep cache
```

The v3 cache filter records lookup and insert status in Envoy filter state for logging and telemetry. Look for statuses like:
- `CacheHit`: Responses served from cache
- `CacheMiss`: Requests forwarded to upstream
- `StaleHitWithSuccessfulValidation`: Stale responses successfully revalidated with upstream
- `NotModifiedHit`: Cache returned a 304 Not Modified response

You can calculate your cache hit ratio:

```bash
# hit_ratio = cache_hits / cache_lookups

```

A healthy cache hit ratio depends on your workload, but for read-heavy API endpoints, you should aim for 60-90% after the cache warms up.

## Performance Impact

Response caching can have a significant positive impact on your system:

- Reduced latency for cache hits (sub-millisecond vs. the original response time)
- Lower CPU and memory usage on backend services
- Fewer database queries for read-heavy endpoints
- Better resilience during traffic spikes

The trade-off is increased memory usage in the Envoy proxy (since it stores cached responses) and the potential for serving stale data. Size your proxy resource limits accordingly if you expect large cached payloads.

## Summary

Response caching in Istio works through Envoy's HTTP cache filter and standard HTTP caching headers. The setup requires two pieces: enabling the cache filter through an EnvoyFilter resource and making sure your services send appropriate Cache-Control headers. For experiments and simple non-production use cases, the built-in memory cache can be useful. For production deployments where you need shared caching across instances, consider integrating with an external cache or a dedicated caching proxy. The key is to start with conservative cache durations and increase them as you gain confidence in your cache invalidation strategy.
