# How to Set Up Response Caching in Azure API Management

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, API Management, Caching, Performance, API Gateway, Cloud

Description: Learn how to configure response caching in Azure API Management to reduce backend load and improve API response times.

---

Caching API responses at the gateway is one of the quickest wins you can get with Azure API Management. If your backend serves the same data for many requests - product catalogs, configuration data, reference tables, or anything that does not change every second - caching those responses at the APIM layer means fewer calls to your backend, faster responses for your consumers, and lower compute costs.

APIM provides a built-in internal cache and also supports connecting to an external Redis cache for larger or more distributed scenarios. In this post, I will cover both approaches, show you how to configure cache policies with real examples, and discuss the nuances that matter in production.

## How APIM Caching Works

The caching mechanism in APIM is straightforward. When a cacheable request comes in, APIM checks its cache for a stored response that matches the request. If it finds one (a cache hit), it returns the cached response immediately without contacting the backend. If it does not find one (a cache miss), it forwards the request to the backend, stores the response in the cache, and returns it to the client.

The cache key is composed of the request method, URL, and optionally, specific headers or query parameters that you configure. Two requests that produce the same cache key will share the same cached response.

## Enabling Basic Response Caching

The simplest caching setup requires just two policy elements: `cache-lookup` in the inbound section and `cache-store` in the outbound section.

```xml
<!-- Cache GET responses for 300 seconds (5 minutes) -->
<!-- The cache key is based on the full request URL by default -->
<inbound>
    <base />
    <cache-lookup vary-by-developer="false"
                  vary-by-developer-groups="false"
                  downstream-caching-type="none">
    </cache-lookup>
</inbound>
<outbound>
    <base />
    <cache-store duration="300" />
</outbound>
```

When `cache-lookup` finds a match, the request short-circuits - it never reaches the backend or the outbound section. The cached response goes straight back to the client.

The `cache-store` element in the outbound section stores the backend's response for the specified duration (in seconds).

## Varying the Cache by Query Parameters

By default, the cache key includes the full URL with query parameters. But sometimes you want to vary the cache only by specific parameters, ignoring others.

For example, if your API accepts a `category` parameter and a `tracking_id` parameter, you probably want to cache by category but not by tracking ID:

```xml
<!-- Cache responses varying only by the 'category' query parameter -->
<!-- Different categories get different cache entries -->
<!-- The 'tracking_id' parameter is ignored for caching purposes -->
<cache-lookup vary-by-developer="false" vary-by-developer-groups="false">
    <vary-by-query-parameter>category</vary-by-query-parameter>
</cache-lookup>
```

If you list specific parameters in `vary-by-query-parameter`, only those parameters are included in the cache key. All other query parameters are ignored.

## Varying the Cache by Headers

Some APIs return different responses based on request headers, like `Accept-Language` or custom headers. You can include headers in the cache key:

```xml
<!-- Cache responses separately for each language -->
<!-- English and Spanish requests get different cached responses -->
<cache-lookup vary-by-developer="false" vary-by-developer-groups="false">
    <vary-by-header>Accept-Language</vary-by-header>
    <vary-by-header>X-Custom-Region</vary-by-header>
</cache-lookup>
```

## Per-Developer and Per-Group Caching

If your API returns different data depending on the subscription or developer group, set `vary-by-developer` or `vary-by-developer-groups` to true. This ensures that each developer (or group) gets their own cache entries rather than sharing cached responses that might contain another user's data.

```xml
<!-- Each subscription gets its own cache -->
<!-- Prevents data leakage between different API consumers -->
<cache-lookup vary-by-developer="true" vary-by-developer-groups="false">
</cache-lookup>
```

This is important for APIs that return personalized or tenant-specific data.

## Conditional Caching

You might not want to cache every response. Maybe you only want to cache successful responses, or only cache GET requests (POST, PUT, DELETE should almost never be cached). The `cache-store` policy has conditions for this:

```xml
<!-- Only cache successful GET responses -->
<!-- Non-200 responses and non-GET methods are not cached -->
<outbound>
    <base />
    <choose>
        <when condition="@(context.Request.Method == "GET" && context.Response.StatusCode == 200)">
            <cache-store duration="300" />
        </when>
    </choose>
</outbound>
```

## Setting Cache Duration Dynamically

Instead of hardcoding the cache duration, you can compute it from the backend's `Cache-Control` header:

```xml
<!-- Use the backend's Cache-Control max-age as the cache duration -->
<!-- Falls back to 60 seconds if the header is missing -->
<outbound>
    <base />
    <cache-store duration="@{
        var cc = context.Response.Headers.GetValueOrDefault("Cache-Control", "");
        if (cc.Contains("max-age="))
        {
            var maxAge = cc.Split(',')
                .Select(s => s.Trim())
                .FirstOrDefault(s => s.StartsWith("max-age="));
            if (maxAge != null && int.TryParse(maxAge.Substring(8), out int seconds))
            {
                return seconds;
            }
        }
        return 60;
    }" />
</outbound>
```

This lets your backend control the cache TTL, which is useful when different endpoints have different freshness requirements.

## Cache Invalidation with cache-remove-value

When data changes on your backend, you want to invalidate the cached response. APIM provides `cache-remove-value` for this purpose. A common pattern is to invalidate the cache on write operations:

```xml
<!-- On POST/PUT/DELETE, invalidate the cached GET response -->
<!-- This ensures consumers get fresh data after modifications -->
<inbound>
    <base />
    <choose>
        <when condition="@(context.Request.Method != "GET")">
            <cache-remove-value key="@("orders-cache-" + context.Request.MatchedParameters["orderId"])" />
        </when>
    </choose>
</inbound>
```

For this to work, you need to use the `cache-lookup-value` and `cache-store-value` policies (the key-value variants) instead of the response-based policies, which gives you more control over the cache key.

## Using an External Redis Cache

The built-in internal cache works fine for single-region deployments and moderate data volumes. But it has limitations:

- It is local to each gateway instance. In a multi-region deployment, each region has its own cache.
- The cache size is limited by the APIM instance's memory.
- Cache entries are lost when the gateway restarts.

For production workloads, connecting an external Azure Cache for Redis is usually the better option. Here is how to set it up.

First, create an Azure Cache for Redis instance in the same region as your APIM instance. Then, in APIM, go to "External cache" and click "Add." Provide the Redis connection string and select the region.

Once configured, APIM automatically uses the external cache for all cache policies. No policy changes are needed - the cache policies work the same way regardless of whether the cache is internal or external.

## Cache Strategies by API Type

Different types of APIs benefit from different caching strategies:

**Reference data APIs** (countries, currencies, product categories): Cache aggressively with long TTLs (hours or even days). These change rarely.

**Search/list APIs** (product search, order lists): Cache with short TTLs (30-60 seconds) and vary by relevant query parameters. The data changes frequently but slight staleness is acceptable.

**Single-resource APIs** (GET /orders/123): Cache with moderate TTLs (5-15 minutes) and invalidate on writes. Use the resource ID as part of the cache key.

**User-specific APIs** (GET /me/profile): Cache with `vary-by-developer="true"` and short TTLs. Be very careful not to serve one user's data to another.

**Real-time APIs** (stock prices, live scores): Do not cache, or use very short TTLs (5-10 seconds) as a backstop against traffic spikes.

## Downstream Caching Headers

APIM can also control how downstream clients and CDNs cache responses by setting `Cache-Control` headers:

```xml
<!-- Set Cache-Control headers for downstream caching -->
<!-- Browsers and CDNs will cache the response for 120 seconds -->
<outbound>
    <base />
    <cache-store duration="300" />
    <set-header name="Cache-Control" exists-action="override">
        <value>public, max-age=120</value>
    </set-header>
</outbound>
```

Notice that the downstream TTL (120 seconds) is shorter than the gateway cache TTL (300 seconds). This is intentional - you want the gateway cache to be the primary cache, with client-side caching as a secondary layer with a shorter lifetime.

## Monitoring Cache Performance

Keep an eye on your cache hit rate through APIM analytics and Application Insights. A high cache hit rate means your caching strategy is working. A low hit rate might mean your cache keys are too specific (every request generates a unique key) or your TTLs are too short.

You can also log cache hits and misses explicitly:

```xml
<!-- Log whether the response came from cache or backend -->
<outbound>
    <base />
    <set-header name="X-Cache-Status" exists-action="override">
        <value>@(context.Response.Headers.ContainsKey("X-APIM-Cache") ? "HIT" : "MISS")</value>
    </set-header>
</outbound>
```

## Summary

Response caching in Azure API Management is a quick way to improve performance and reduce backend load. Start with the basic `cache-lookup` and `cache-store` policies, configure appropriate vary-by rules, set sensible TTLs, and move to an external Redis cache when you need cross-region consistency or larger cache sizes. The key is matching your caching strategy to your data's freshness requirements - cache aggressively where you can, and skip caching where you must.
