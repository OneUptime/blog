# How to Configure CDN Cache Rules for IPv6 Clients

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, CDN, Caching, Cache Rules, Cloudflare, Fastly

Description: A guide to configuring CDN cache rules that handle IPv6 clients correctly, including cache key variations, TTL policies, and IPv6-specific caching considerations.

CDN caching for IPv6 clients generally works the same as IPv4 - the cache key is typically derived from the URL and other cache-varying request attributes, not the client IP. However, there are specific scenarios where IPv6 client information affects caching behavior.

## Do IPv4 and IPv6 Clients Get Different Cached Content?

By default: **No**. CDN cache keys are primarily based on the URL and, when configured, other cache-varying request attributes - not the client IP version. Both IPv4 and IPv6 clients receive the same cached response.

Exceptions where IP version might matter:
- Geo-based content differentiation (IPv6 and IPv4 may geolocate differently)
- A/B testing by IP range
- Content that includes the client's IP address

## Cloudflare Worker Example

```javascript
// Cloudflare Worker: use the same cache entry for IPv4 and IPv6 clients
export default {
  async fetch(request, env, ctx) {
    if (request.method !== 'GET') {
      return fetch(request);
    }

    // Most content: don't vary by IP version
    const cacheKey = new Request(request.url, request);
    const cache = caches.default;

    let response = await cache.match(cacheKey);

    if (!response) {
      response = await fetch(request);

      // Cache for both IPv4 and IPv6 clients
      response = new Response(response.body, response);
      response.headers.set('Cache-Control', 's-maxage=3600');
      ctx.waitUntil(cache.put(cacheKey, response.clone()));
    }

    return response;
  },
};
```

## Cloudflare Cache Rules for IPv6

```text
# Cloudflare Cache Rule: Cache everything for CDN assets

When incoming requests match:
  Expression: (http.host eq "cdn.example.com")

Then:
  Cache eligibility: Eligible for cache
  Setting: Edge TTL -> Ignore cache-control header and use this TTL: 1 month

# This applies equally to IPv4 and IPv6 clients
```

## Fastly VCL: Cache Key for IPv6

```vcl
sub vcl_hash {
  hash_data(req.url);
  hash_data(req.http.host);

  # For most content: don't include IP version in cache key
  # Both IPv4 and IPv6 clients share the same cache

  # Exception: if content varies by geographic region and IPv4/IPv6
  # geolocate differently, add region to cache key:
  # if (client.geo.country_code != "?") {
  #   hash_data(client.geo.country_code);
  # }
}
```

## Nginx Cache Configuration

```nginx
proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=ipv6_cache:10m max_size=10g;

server {
    listen 443 ssl;
    listen [::]:443 ssl;

    location / {
        proxy_cache ipv6_cache;

        # Cache key: doesn't include client IP
        proxy_cache_key "$scheme$proxy_host$request_uri";

        # Both IPv4 and IPv6 clients use same cached content
        proxy_cache_valid 200 1h;
        proxy_cache_valid 404 1m;

        # Add X-Cache-Status header for debugging
        add_header X-Cache-Status $upstream_cache_status always;

        proxy_pass http://backends;
    }
}
```

## When to Vary Cache by IPv6

### Geo-Based Content

```text
# Cloudflare Cache Rule: vary cache by country
# Note: Cache key user features such as Geo are available on Enterprise plans.

When incoming requests match:
  Expression: (http.host eq "www.example.com")

Then:
  Cache eligibility: Eligible for cache
  Setting: Cache Key -> User features -> Geo

# Different IPv6 and IPv4 client addresses may geolocate differently,
# so a country-based cache key can create separate cache entries.
```

### IPv6-Specific Content

```nginx
# If your application serves different content to IPv6 clients:
set $ip_version "IPv4";
if ($remote_addr ~ ":") {
    set $ip_version "IPv6";
}

proxy_set_header X-Client-IP-Version $ip_version;
proxy_cache_key "$scheme$proxy_host$request_uri$ip_version";
```

## Cache Purging for IPv6

Cache purging works the same regardless of client IP version when IPv4 and IPv6 share the same cache key. If you add cache-key variations such as country, language, or device type, include those values in the purge request or use a broader purge method:

```bash
# Cloudflare: Purge specific URL when IPv4 and IPv6 share the same cache key
curl -X POST "https://api.cloudflare.com/client/v4/zones/{zone_id}/purge_cache" \
  -H "Authorization: Bearer $CF_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"files": ["https://example.com/path/to/resource"]}'

# If your Cloudflare Cache Key also varies by country, device type, or language,
# include headers such as CF-IPCountry, CF-Device-Type, or Accept-Language.

# Fastly: Purge by URL. If you changed vcl_hash to add more cache-key inputs,
# make sure your purge strategy matches that hash or use surrogate keys.
curl -X PURGE https://cdn.example.com/path/to/resource \
  -H "Fastly-Key: $FASTLY_API_KEY"
```

## Monitoring Cache Hit Rate for IPv6 Clients

```promql
# If your CDN exports metrics by client IP version:
sum(rate(cdn_requests_total{ip_version="ipv6", cache_status="HIT"}[5m])) /
sum(rate(cdn_requests_total{ip_version="ipv6"}[5m]))
```

IPv6 clients typically achieve similar cache hit rates as IPv4 clients since CDN caching is URL-based - the only exception is when content genuinely varies by client network characteristics that differ between IPv4 and IPv6 deployments.
