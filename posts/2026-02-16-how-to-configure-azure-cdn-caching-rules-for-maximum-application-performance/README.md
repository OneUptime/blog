# How to Configure Azure CDN Caching Rules for Maximum Application Performance

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, CDN, Caching, Performance, Web Optimization, Cloud Infrastructure, Content Delivery

Description: Learn how to configure Azure CDN caching rules to significantly boost your application performance with proper TTL settings, query string handling, and cache purging strategies.

---

If your application serves static assets, images, or even dynamic content to a global user base, Azure CDN (Content Delivery Network) is one of the most effective tools you can use to reduce latency and offload your origin server. But simply enabling a CDN endpoint is not enough. You need to configure caching rules carefully to get the most out of it.

In this post, I will walk you through the details of setting up Azure CDN caching rules properly, including TTL management, query string behavior, custom rules, and cache invalidation strategies.

## Why Caching Rules Matter

When a user requests a resource through Azure CDN, the edge server checks whether it has a cached copy of that resource. If it does, it serves it directly without reaching your origin. If not, it fetches from the origin, caches it, and then serves it to the user.

The problem is that default caching behavior might not match your application's needs. Static CSS files might need to be cached for weeks, while API responses should never be cached. That is where caching rules come in. They let you define exactly how long different types of content should live in the CDN cache, and under what conditions the cache should be bypassed.

## Understanding Azure CDN Profiles

Azure CDN comes in several flavors, and caching rule configuration varies slightly between them:

- **Azure CDN Standard from Microsoft** - uses rules engine for caching behavior
- **Azure CDN Standard from Akamai** - uses global caching rules and custom caching rules
- **Azure CDN Standard from Verizon** - uses the Premium Verizon rules engine
- **Azure Front Door** - integrated CDN with more advanced routing and caching options

For this guide, I will focus on the Azure CDN Standard from Microsoft profile, since it is the most commonly used and has good flexibility through the rules engine.

## Setting Up Global Caching Rules

Global caching rules apply to every request that hits your CDN endpoint. You can configure them through the Azure portal or via Azure CLI.

Here is how to set a global caching rule using Azure CLI that forces a specific cache duration:

```bash
# Set a global caching rule to cache all content for 7 days
# Override means ignore origin cache headers
az cdn endpoint rule add \
  --resource-group myResourceGroup \
  --profile-name myCdnProfile \
  --name myEndpoint \
  --order 1 \
  --rule-name "GlobalCacheRule" \
  --match-variable RequestUri \
  --operator Any \
  --action-name CacheExpiration \
  --cache-behavior Override \
  --cache-duration "7.00:00:00"
```

The `cache-behavior` parameter accepts three values:

- **Override** - ignores the origin's cache headers and applies the specified duration
- **SetIfMissing** - applies the specified duration only if the origin does not send cache headers
- **BypassCache** - tells CDN not to cache the response at all

For most static-heavy applications, I recommend using `SetIfMissing` as your global rule. This way, if your origin server sends proper Cache-Control headers, the CDN respects them, but if it does not, your fallback duration kicks in.

## Configuring Custom Caching Rules by File Extension

Different file types need different cache durations. JavaScript and CSS files that are versioned with hashes can be cached for a long time, while HTML pages should be refreshed more frequently.

Here is an example of creating custom caching rules for different file types using the rules engine:

```json
{
  "rules": [
    {
      "name": "CacheStaticAssets",
      "order": 1,
      "conditions": [
        {
          "name": "UrlFileExtension",
          "parameters": {
            "operator": "Equal",
            "matchValues": ["css", "js", "woff2", "woff", "ttf"],
            "transforms": ["Lowercase"]
          }
        }
      ],
      "actions": [
        {
          "name": "CacheExpiration",
          "parameters": {
            "cacheBehavior": "Override",
            "cacheType": "All",
            "cacheDuration": "30.00:00:00"
          }
        }
      ]
    },
    {
      "name": "CacheImages",
      "order": 2,
      "conditions": [
        {
          "name": "UrlFileExtension",
          "parameters": {
            "operator": "Equal",
            "matchValues": ["jpg", "jpeg", "png", "gif", "svg", "webp"],
            "transforms": ["Lowercase"]
          }
        }
      ],
      "actions": [
        {
          "name": "CacheExpiration",
          "parameters": {
            "cacheBehavior": "Override",
            "cacheType": "All",
            "cacheDuration": "90.00:00:00"
          }
        }
      ]
    },
    {
      "name": "ShortCacheHTML",
      "order": 3,
      "conditions": [
        {
          "name": "UrlFileExtension",
          "parameters": {
            "operator": "Equal",
            "matchValues": ["html", "htm"],
            "transforms": ["Lowercase"]
          }
        }
      ],
      "actions": [
        {
          "name": "CacheExpiration",
          "parameters": {
            "cacheBehavior": "Override",
            "cacheType": "All",
            "cacheDuration": "0.01:00:00"
          }
        }
      ]
    }
  ]
}
```

This setup caches static assets for 30 days, images for 90 days, and HTML files for just 1 hour. Adjust these durations based on how frequently your content changes.

## Handling Query Strings

Query strings can have a major impact on your cache hit ratio. By default, Azure CDN treats URLs with different query strings as different resources. So `style.css?v=1` and `style.css?v=2` would result in two separate cache entries.

You have three options for query string behavior:

1. **IgnoreQueryString** - strips query strings before caching, so all variations hit the same cached object
2. **BypassCaching** - does not cache any URL that includes query strings
3. **UseQueryString** - treats each unique query string as a separate cached resource (default)

For most applications, `UseQueryString` is the right choice if you use query strings for cache busting (like `app.js?v=abc123`). If your query strings are irrelevant to content (like tracking parameters), switch to `IgnoreQueryString`.

```bash
# Configure query string caching behavior
az cdn endpoint update \
  --resource-group myResourceGroup \
  --profile-name myCdnProfile \
  --name myEndpoint \
  --query-string-caching-behavior IgnoreQueryString
```

## Setting Cache-Control Headers at the Origin

Even with CDN-level caching rules, you should still set proper Cache-Control headers on your origin server. This gives you defense in depth and ensures consistent behavior even if the CDN configuration changes.

If you are running an Express.js application on Azure App Service, here is how you might set headers:

```javascript
const express = require('express');
const app = express();

// Serve static files with long cache duration
// maxAge is in milliseconds - 30 days = 2592000000ms
app.use('/static', express.static('public', {
  maxAge: '30d',
  immutable: true, // tells CDN the content will never change at this URL
  etag: true       // enable ETags for conditional requests
}));

// Set short cache for HTML pages
// This middleware runs for all HTML responses
app.use((req, res, next) => {
  if (req.path.endsWith('.html') || req.path === '/') {
    res.setHeader('Cache-Control', 'public, max-age=3600, must-revalidate');
  }
  next();
});
```

## Cache Purging and Invalidation

No matter how well you configure your caching rules, there will be times when you need to force a cache refresh. Maybe you deployed a critical bug fix, or you need to update content immediately.

Azure CDN supports two types of purging:

- **Single path purge** - purges a specific URL
- **Wildcard purge** - purges all URLs matching a pattern

```bash
# Purge a specific file from the CDN cache
az cdn endpoint purge \
  --resource-group myResourceGroup \
  --profile-name myCdnProfile \
  --name myEndpoint \
  --content-paths "/css/style.css"

# Purge all JavaScript files
az cdn endpoint purge \
  --resource-group myResourceGroup \
  --profile-name myCdnProfile \
  --name myEndpoint \
  --content-paths "/js/*"

# Purge everything (use with caution - causes a thundering herd)
az cdn endpoint purge \
  --resource-group myResourceGroup \
  --profile-name myCdnProfile \
  --name myEndpoint \
  --content-paths "/*"
```

Be careful with wildcard purges. When you purge everything, every subsequent request hits your origin server until the CDN repopulates its cache. This can cause a traffic spike on your origin. A better approach is to use versioned file names (like `style.a3f8b2.css`) so old cached files simply become unused while the new files get cached independently.

## Monitoring Cache Performance

After configuring your rules, you want to verify they are working. Azure CDN provides metrics you can view in the Azure portal:

- **Cache hit ratio** - the percentage of requests served from cache. Aim for 85% or higher for static content.
- **Origin request count** - how many requests reach your origin. This should drop after proper caching.
- **Total bandwidth** - shows how much data flows through the CDN.

You can also check the `X-Cache` response header in your browser's developer tools. A value of `TCP_HIT` means the content was served from cache, while `TCP_MISS` means it was fetched from the origin.

## Recommended Caching Strategy

Based on years of working with Azure CDN, here is my recommended approach:

1. Set a global `SetIfMissing` rule with a 24-hour TTL as your safety net.
2. Create specific rules for static assets (JS, CSS, fonts) with 30-day TTLs.
3. Create specific rules for images with 90-day TTLs.
4. Set HTML pages to 1-hour TTL with `must-revalidate`.
5. Use `UseQueryString` if you rely on query-based cache busting.
6. Never cache API responses at the CDN level unless you fully understand the implications.
7. Set proper Cache-Control headers at the origin as a fallback.
8. Monitor your cache hit ratio weekly and adjust rules as needed.

## Wrapping Up

Azure CDN caching rules give you fine-grained control over how content is stored and served at the edge. The key is to match your caching durations to how frequently your content actually changes. Static assets that are fingerprinted with hashes can be cached aggressively, while dynamic content needs short TTLs or no caching at all. Take the time to configure these rules properly, and you will see measurable improvements in response times and a significant reduction in origin server load.
