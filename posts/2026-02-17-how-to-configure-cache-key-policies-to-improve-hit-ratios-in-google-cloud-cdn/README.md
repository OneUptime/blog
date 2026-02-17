# How to Configure Cache Key Policies to Improve Hit Ratios in Google Cloud CDN

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud CDN, Cache Key, Performance, Content Delivery

Description: Learn how to configure cache key policies in Google Cloud CDN to maximize cache hit ratios by controlling what makes each cached response unique.

---

The cache key is what Cloud CDN uses to decide whether a request matches something already in cache. By default, the cache key includes the full URL - protocol, host, path, and all query string parameters. This is safe but often too granular. Two requests that produce identical responses might have different cache keys because of irrelevant query parameters, leading to unnecessary cache misses.

By fine-tuning the cache key policy, you can dramatically improve your cache hit ratio. This guide explains how cache keys work, what you can include or exclude, and how to configure them for common scenarios.

## Understanding Cache Keys

A cache key is essentially a fingerprint that identifies a unique piece of cached content. When a request comes in, Cloud CDN computes its cache key and checks if there is a matching entry in cache. If there is a match (cache hit), the cached response is returned. If not (cache miss), the request goes to the origin.

The default cache key includes:

- **Protocol** (HTTP or HTTPS)
- **Host** header
- **Path** (the URL path without query string)
- **Query string** (all parameters)

So `https://cdn.example.com/image.jpg?width=200&tracking=abc123` and `https://cdn.example.com/image.jpg?width=200&tracking=xyz789` are two different cache entries, even if the tracking parameter does not affect the response.

## Cache Key Policy Options

Cloud CDN lets you control each component of the cache key:

| Component | Default | Can Exclude? |
|-----------|---------|-------------|
| Protocol | Included | Yes |
| Host | Included | Yes |
| Path | Always included | No |
| Query string | All included | Yes (all or specific params) |
| HTTP headers | Not included | Can include specific headers |
| Cookies | Not included | Can include specific cookies |

## Step 1: Exclude Irrelevant Query Parameters

The most common optimization is excluding query parameters that do not affect the response. Analytics tracking parameters, session IDs, and cache-busting tokens are prime candidates.

```bash
# Exclude specific query string parameters from the cache key
gcloud compute backend-services update my-backend \
    --cache-key-include-query-string \
    --cache-key-query-string-blacklist="utm_source,utm_medium,utm_campaign,fbclid,gclid,_ga" \
    --global \
    --project=my-project
```

Alternatively, if only a few parameters matter, use a whitelist approach.

```bash
# Only include specific query parameters in the cache key
gcloud compute backend-services update my-backend \
    --cache-key-include-query-string \
    --cache-key-query-string-whitelist="width,height,format,quality" \
    --global \
    --project=my-project
```

The whitelist approach is safer when your application uses many query parameters but only a few affect the response.

## Step 2: Exclude Protocol and Host

If your content is the same regardless of whether it is accessed via HTTP or HTTPS, or via different host aliases, you can exclude these from the cache key.

```bash
# Exclude protocol from cache key (HTTP and HTTPS share cache entries)
gcloud compute backend-services update my-backend \
    --no-cache-key-include-protocol \
    --global \
    --project=my-project

# Exclude host from cache key (all host headers share cache entries)
gcloud compute backend-services update my-backend \
    --no-cache-key-include-host \
    --global \
    --project=my-project
```

Excluding the host is useful when you have multiple domains pointing to the same backend - for example, `cdn.example.com` and `static.example.com` serving the same content.

## Step 3: Include HTTP Headers in the Cache Key

Sometimes the response varies based on a request header. The most common example is the `Accept-Encoding` header for compressed vs. uncompressed content. Cloud CDN handles this automatically, but you can add custom headers too.

```bash
# Include specific HTTP headers in the cache key
gcloud compute backend-services update my-backend \
    --cache-key-include-http-headers="X-Custom-Region,X-AB-Test-Group" \
    --global \
    --project=my-project
```

Only add headers that genuinely affect the response. Each additional header in the cache key reduces the chance of a cache hit.

## Step 4: Include Named Cookies in the Cache Key

For personalized content that varies by cookie value, you can include specific cookies in the cache key.

```bash
# Include specific cookies in the cache key
gcloud compute backend-services update my-backend \
    --cache-key-include-named-cookies="locale,currency,ab-test-variant" \
    --global \
    --project=my-project
```

Be very selective with cookies. Including a session cookie would effectively disable caching since every user would have a unique cache key.

## Step 5: Exclude Query Strings Entirely

For content where the query string never affects the response (like static assets served by URL path alone), exclude it completely.

```bash
# Exclude the entire query string from the cache key
gcloud compute backend-services update my-backend \
    --no-cache-key-include-query-string \
    --global \
    --project=my-project
```

With this setting, `image.jpg?v=1` and `image.jpg?v=2` and `image.jpg` all map to the same cache entry.

## Terraform Configuration

Here is a complete Terraform setup with cache key policies.

```hcl
# Backend service with optimized cache key policy
resource "google_compute_backend_service" "cdn_backend" {
  name                  = "cdn-backend"
  protocol              = "HTTP"
  port_name             = "http"
  enable_cdn            = true
  load_balancing_scheme = "EXTERNAL"

  cdn_policy {
    cache_mode  = "CACHE_ALL_STATIC"
    default_ttl = 3600
    max_ttl     = 86400
    client_ttl  = 300

    cache_key_policy {
      # Include host and protocol for security
      include_host     = true
      include_protocol = true

      # Only include query parameters that affect the response
      include_query_string = true
      query_string_whitelist = [
        "width",
        "height",
        "format",
        "quality",
      ]

      # Include headers that affect content
      include_http_headers = ["Accept-Language"]

      # Include cookies for personalization
      include_named_cookies = ["locale"]
    }
  }

  backend {
    group = google_compute_instance_group_manager.web.instance_group
  }

  health_checks = [google_compute_health_check.default.id]
}
```

## Common Scenarios and Recommended Configurations

### Static Asset CDN

For serving CSS, JavaScript, images, and fonts where query strings are just cache busters:

```bash
# Static assets - ignore query strings, include host
gcloud compute backend-services update static-backend \
    --no-cache-key-include-query-string \
    --cache-key-include-host \
    --cache-key-include-protocol \
    --global \
    --project=my-project
```

### Image Transformation Service

For an image service where query parameters control transformations:

```bash
# Image service - only width, height, and format matter
gcloud compute backend-services update image-backend \
    --cache-key-include-query-string \
    --cache-key-query-string-whitelist="w,h,fit,format,quality" \
    --global \
    --project=my-project
```

### Multi-Language Website

For a site that serves different content based on language:

```bash
# Multi-language - include Accept-Language header and locale cookie
gcloud compute backend-services update web-backend \
    --cache-key-include-http-headers="Accept-Language" \
    --cache-key-include-named-cookies="locale" \
    --global \
    --project=my-project
```

### API with Versioning

For an API where the version is in the query string:

```bash
# API - only version parameter affects response
gcloud compute backend-services update api-backend \
    --cache-key-include-query-string \
    --cache-key-query-string-whitelist="version,v,api_key" \
    --global \
    --project=my-project
```

## Measuring the Impact

After changing cache key policies, monitor your cache hit ratio to see the improvement.

```bash
# Query cache hit/miss metrics from Cloud Logging
gcloud logging read \
    'resource.type="http_load_balancer" AND jsonPayload.statusDetails="response_from_cache"' \
    --format="json(timestamp,httpRequest.requestUrl)" \
    --limit=50 \
    --project=my-project
```

You can also create a Cloud Monitoring dashboard to track cache hit ratios over time.

```bash
# View CDN cache hit ratio metric
gcloud monitoring dashboards create \
    --config-from-file=cdn-dashboard.json \
    --project=my-project
```

A well-configured cache key policy can push cache hit ratios from 40-50% to 80-90% or higher, depending on your traffic patterns.

## Pitfalls to Avoid

**Excluding too much**: If you exclude a parameter that actually affects the response, users might see stale or incorrect content. Always verify that excluded components truly do not change the response.

**Including session cookies**: A session cookie in the cache key means every user gets their own cache entry, effectively disabling caching.

**Forgetting about Vary headers**: If your origin sends a `Vary` header, Cloud CDN uses it to vary the cache alongside the cache key policy. Make sure your origin's Vary header aligns with your cache key configuration.

**Not testing after changes**: Always test with real traffic patterns. A configuration that looks good on paper might not account for actual request variations.

## Wrapping Up

Cache key policies are one of the highest-impact, lowest-effort optimizations you can make to Cloud CDN. By removing irrelevant query parameters, tracking tokens, and other noise from the cache key, you let Cloud CDN recognize that many different-looking requests actually produce the same response. The result is higher cache hit ratios, lower origin load, and faster response times for your users. Start with a query string whitelist of the parameters that actually matter and go from there.
