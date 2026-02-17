# How to Troubleshoot Low Cache Hit Ratios in Google Cloud CDN

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud CDN, Cache Optimization, Troubleshooting, Performance

Description: A practical guide to diagnosing and fixing low cache hit ratios in Google Cloud CDN by identifying common caching issues and misconfigurations.

---

You enabled Cloud CDN expecting faster response times and lower origin load, but your cache hit ratio is sitting at 20% and your origin is still handling most requests. This is more common than you might think, and it usually comes down to a handful of fixable issues.

In this guide, I will walk through the most common causes of low cache hit ratios and show you how to diagnose and fix each one.

## What Is a Good Cache Hit Ratio?

Before troubleshooting, let's set expectations. Cache hit ratios depend heavily on your traffic pattern:

- **Static sites**: 90-99% is achievable
- **Mixed content (static + dynamic)**: 60-80% is typical
- **API-heavy applications**: 30-50% might be reasonable
- **Personalized content**: 10-30% unless you can separate cacheable from non-cacheable

If your ratio is significantly below these benchmarks for your content type, something is likely misconfigured.

## Step 1: Check What Is Actually Being Cached

Start by looking at your CDN logs to understand the breakdown of hits, misses, and uncacheable requests.

```bash
# Get a breakdown of cache status from recent logs
gcloud logging read \
    'resource.type="http_load_balancer" AND timestamp>="2026-02-17T00:00:00Z"' \
    --format="value(jsonPayload.statusDetails)" \
    --limit=5000 \
    --project=my-project | sort | uniq -c | sort -rn
```

You will see entries like:
- `response_from_cache` - cache hits
- `response_sent_by_backend` - cache misses that went to origin
- `cache_fill` - responses that were stored in cache

If most requests show `response_sent_by_backend` without any `cache_fill`, responses are not being cached at all.

## Step 2: Check Origin Response Headers

The number one cause of low cache hit ratios is incorrect caching headers from the origin. If your origin sends `Cache-Control: private` or `Cache-Control: no-store`, Cloud CDN will not cache the response regardless of your cache mode settings (unless you use FORCE_CACHE_ALL).

```bash
# Check the origin's response headers directly
curl -I -H "Host: example.com" http://ORIGIN_IP/path/to/resource

# Look for these headers:
# Cache-Control: public, max-age=3600  (good - cacheable)
# Cache-Control: private               (bad - CDN will not cache)
# Cache-Control: no-store              (bad - CDN will not cache)
# Set-Cookie: ...                       (bad - prevents caching by default)
# Vary: *                              (bad - prevents caching)
```

### Fix: Configure Proper Cache-Control Headers

Update your origin to send appropriate caching headers for static content.

For Nginx:

```nginx
# nginx.conf - Set proper cache headers for static content
location ~* \.(css|js|jpg|jpeg|png|gif|ico|svg|woff|woff2|ttf|eot)$ {
    # Allow CDN and browser caching for 1 day
    add_header Cache-Control "public, max-age=86400";

    # Remove Set-Cookie for static assets
    proxy_hide_header Set-Cookie;
}

location /api/ {
    # Do not cache API responses by default
    add_header Cache-Control "private, no-store";
    proxy_pass http://backend;
}
```

For Express.js:

```javascript
// Set caching headers for static files in Express
app.use('/static', express.static('public', {
  maxAge: '1d',
  setHeaders: (res, path) => {
    // Set public cache control for CDN caching
    res.set('Cache-Control', 'public, max-age=86400');
  }
}));
```

## Step 3: Check for Set-Cookie Headers

Responses with `Set-Cookie` headers are not cached by Cloud CDN in CACHE_ALL_STATIC and USE_ORIGIN_HEADERS modes. This is a very common issue - a middleware or framework adds a session cookie to every response, including static assets.

```bash
# Check if your responses include Set-Cookie headers
curl -I https://cdn.example.com/static/style.css 2>&1 | grep -i set-cookie
```

### Fix: Remove Set-Cookie from Cacheable Responses

Either configure your application to not set cookies on static asset responses, or strip the header at the reverse proxy level.

```nginx
# Strip Set-Cookie from static asset responses in Nginx
location ~* \.(css|js|jpg|jpeg|png|gif|ico|svg)$ {
    proxy_hide_header Set-Cookie;
    proxy_ignore_headers Set-Cookie;
    add_header Cache-Control "public, max-age=86400";
    proxy_pass http://backend;
}
```

## Step 4: Check the Vary Header

The `Vary` header tells Cloud CDN which request headers affect the response. Cloud CDN supports `Vary: Accept`, `Vary: Accept-Encoding`, and `Vary: Origin`. If your origin sends `Vary: *` or includes unsupported headers like `Vary: User-Agent`, the response will not be cached.

```bash
# Check for Vary headers
curl -I https://cdn.example.com/page 2>&1 | grep -i vary
```

### Fix: Limit Vary Headers

Configure your origin to only include supported Vary values.

```nginx
# Set specific Vary headers instead of wildcard
add_header Vary "Accept-Encoding, Origin";
```

## Step 5: Check Cache Key Configuration

An overly granular cache key produces too many unique cache entries. If your cache key includes query parameters like session IDs, timestamps, or tracking codes, every request looks unique to the CDN.

```bash
# Check your current cache key configuration
gcloud compute backend-services describe my-backend \
    --global \
    --format="json(cdnPolicy.cacheKeyPolicy)" \
    --project=my-project
```

### Fix: Optimize Cache Keys

Exclude irrelevant query parameters from the cache key.

```bash
# Exclude tracking parameters from cache key
gcloud compute backend-services update my-backend \
    --cache-key-include-query-string \
    --cache-key-query-string-blacklist="utm_source,utm_medium,utm_campaign,fbclid,gclid,_ga,_t,sid,session" \
    --global \
    --project=my-project
```

## Step 6: Check Content Type Detection

In CACHE_ALL_STATIC mode, Cloud CDN only caches responses with recognized static content types. If your origin does not set the `Content-Type` header correctly, or sets it to something like `application/octet-stream`, Cloud CDN might not cache it.

```bash
# Check Content-Type headers from origin
curl -I http://ORIGIN_IP/images/photo.jpg | grep -i content-type

# Expected: Content-Type: image/jpeg
# Problematic: Content-Type: application/octet-stream
```

### Fix: Set Correct Content Types

Configure your origin or web server to return the correct MIME types.

```nginx
# Ensure correct MIME types in Nginx
include mime.types;
default_type application/octet-stream;
```

If you cannot fix the origin, switch to FORCE_CACHE_ALL mode for that backend.

```bash
# Force caching regardless of content type
gcloud compute backend-services update my-backend \
    --cache-mode=FORCE_CACHE_ALL \
    --default-ttl=3600 \
    --global \
    --project=my-project
```

## Step 7: Check Request Methods

Cloud CDN only caches GET and HEAD requests. POST, PUT, DELETE, and other methods always go to the origin.

```bash
# Check the breakdown of request methods in your logs
gcloud logging read \
    'resource.type="http_load_balancer"' \
    --format="value(httpRequest.requestMethod)" \
    --limit=1000 \
    --project=my-project | sort | uniq -c | sort -rn
```

If you see a high percentage of non-GET requests, that is expected behavior - those cannot be cached.

## Step 8: Check Response Status Codes

Cloud CDN caches successful responses (200, 203, 204, 206, 300, 301, 302, 307, 308, 404, 405, 410, 421, 451). Other status codes are not cached by default.

```bash
# Check the response code distribution
gcloud logging read \
    'resource.type="http_load_balancer"' \
    --format="value(httpRequest.status)" \
    --limit=1000 \
    --project=my-project | sort | uniq -c | sort -rn
```

If you see many 5xx responses, those will not be cached and will always hit the origin.

## Step 9: Check Request Volume and Distribution

Low cache hit ratios can also be caused by insufficient traffic volume or a "long tail" distribution where most URLs are requested only once.

```bash
# Check URL request frequency distribution
gcloud logging read \
    'resource.type="http_load_balancer" AND httpRequest.requestMethod="GET"' \
    --format="value(httpRequest.requestUrl)" \
    --limit=5000 \
    --project=my-project | sort | uniq -c | sort -rn | head -20
```

If most URLs are only requested once, there is not much for the CDN to cache. In this case, focus your caching effort on the high-traffic URLs.

## Step 10: Check TTL Settings

If your TTLs are too short, content expires from cache before it is requested again.

```bash
# Check current TTL settings
gcloud compute backend-services describe my-backend \
    --global \
    --format="json(cdnPolicy.defaultTtl,cdnPolicy.maxTtl,cdnPolicy.clientTtl)" \
    --project=my-project
```

### Fix: Increase TTLs for Stable Content

```bash
# Increase TTLs for content that does not change frequently
gcloud compute backend-services update my-backend \
    --default-ttl=86400 \
    --max-ttl=604800 \
    --global \
    --project=my-project
```

## Diagnostic Checklist

Run through this checklist when troubleshooting low cache hit ratios:

1. Are responses being cached at all? Check logs for `cache_fill` entries
2. Does the origin send cacheable headers? Check Cache-Control, Expires
3. Are Set-Cookie headers present on cacheable responses?
4. Is the Vary header set to supported values only?
5. Is the cache key too granular? Check for tracking parameters
6. Is the Content-Type correct for static assets?
7. Are most requests GET/HEAD?
8. Is the TTL long enough for your traffic pattern?
9. Is there enough traffic volume to benefit from caching?
10. Is CACHE_ALL_STATIC missing content types you expect to be cached?

## Wrapping Up

Low cache hit ratios almost always trace back to one of these issues: bad origin headers, Set-Cookie on static assets, overly granular cache keys, or misconfigured cache modes. Start with the logs to understand what is happening, then work through the checklist methodically. Most teams can double or triple their cache hit ratio just by fixing headers and optimizing cache keys. It is one of the highest-return optimizations you can make for your CDN setup.
