# How to Configure Cache Modes and TTL Settings for Google Cloud CDN

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud CDN, Caching, TTL, Performance, Content Delivery

Description: Learn how to configure cache modes and TTL settings in Google Cloud CDN to optimize content delivery performance and control caching behavior.

---

Cloud CDN caching behavior is controlled by two things: the cache mode and the TTL settings. Getting these right is the difference between a CDN that actually accelerates your application and one that just passes through every request to your origin. I have seen teams deploy Cloud CDN and wonder why their cache hit ratios are terrible - almost always, it comes down to misconfigured cache modes or TTLs.

This guide covers all three cache modes, how to set TTLs at different levels, and how to choose the right configuration for your use case.

## Understanding Cache Modes

Cloud CDN offers three cache modes that determine how it decides what to cache and for how long:

### CACHE_ALL_STATIC (Default)

This mode automatically caches static content based on the response's Content-Type header. Cloud CDN has a built-in list of static content types (images, CSS, JavaScript, fonts, etc.) and caches responses with these types even if the origin does not send explicit caching headers.

### USE_ORIGIN_HEADERS

In this mode, Cloud CDN only caches responses that have valid caching headers from the origin (Cache-Control or Expires). If your origin does not send these headers, nothing gets cached. This gives you full control but requires your origin to be properly configured.

### FORCE_CACHE_ALL

This mode caches all responses regardless of content type or origin headers. It is aggressive and should be used carefully, but it is useful for fully static sites or APIs where you know every response is cacheable.

## Setting the Cache Mode

You configure the cache mode on the backend service or backend bucket that is behind your Cloud CDN-enabled load balancer.

```bash
# Set the cache mode to CACHE_ALL_STATIC (the default)
gcloud compute backend-services update my-backend \
    --cache-mode=CACHE_ALL_STATIC \
    --global \
    --project=my-project

# Set the cache mode to USE_ORIGIN_HEADERS
gcloud compute backend-services update my-backend \
    --cache-mode=USE_ORIGIN_HEADERS \
    --global \
    --project=my-project

# Set the cache mode to FORCE_CACHE_ALL
gcloud compute backend-services update my-backend \
    --cache-mode=FORCE_CACHE_ALL \
    --global \
    --project=my-project
```

For backend buckets (Cloud Storage origins), the commands are similar.

```bash
# Set cache mode on a backend bucket
gcloud compute backend-buckets update my-bucket-backend \
    --cache-mode=CACHE_ALL_STATIC \
    --project=my-project
```

## Configuring TTL Settings

Cloud CDN has three TTL settings that work together:

- **Default TTL**: Applied when the origin does not send caching headers (only relevant for CACHE_ALL_STATIC and FORCE_CACHE_ALL modes)
- **Max TTL**: The maximum TTL that Cloud CDN will use, even if the origin specifies a longer TTL
- **Client TTL**: Controls the Cache-Control max-age sent to clients, separate from the CDN cache TTL

### Setting Default TTL

The default TTL is used when the origin response does not include Cache-Control or Expires headers.

```bash
# Set the default TTL to 1 hour (3600 seconds)
gcloud compute backend-services update my-backend \
    --default-ttl=3600 \
    --global \
    --project=my-project
```

### Setting Max TTL

The max TTL caps the caching duration. Even if your origin sends `Cache-Control: max-age=86400` (1 day), Cloud CDN will only cache for the max TTL duration.

```bash
# Set the max TTL to 12 hours
gcloud compute backend-services update my-backend \
    --max-ttl=43200 \
    --global \
    --project=my-project
```

### Setting Client TTL

Client TTL controls what browsers and intermediate caches see. This is useful when you want Cloud CDN to cache content for a long time but want browsers to revalidate more frequently.

```bash
# Set the client TTL to 5 minutes while CDN caches for longer
gcloud compute backend-services update my-backend \
    --client-ttl=300 \
    --global \
    --project=my-project
```

### Combining All TTL Settings

Here is how to set all three TTLs together.

```bash
# Configure comprehensive TTL settings
gcloud compute backend-services update my-backend \
    --cache-mode=CACHE_ALL_STATIC \
    --default-ttl=3600 \
    --max-ttl=86400 \
    --client-ttl=300 \
    --global \
    --project=my-project
```

This means:
- Content without caching headers is cached for 1 hour (default TTL)
- Content is never cached longer than 24 hours, regardless of origin headers (max TTL)
- Browsers are told to cache for 5 minutes (client TTL)

## Terraform Configuration

Here is the full setup in Terraform.

```hcl
# Backend service with Cloud CDN cache settings
resource "google_compute_backend_service" "my_backend" {
  name                  = "my-backend"
  protocol              = "HTTP"
  port_name             = "http"
  timeout_sec           = 30
  enable_cdn            = true
  load_balancing_scheme = "EXTERNAL"

  cdn_policy {
    cache_mode  = "CACHE_ALL_STATIC"
    default_ttl = 3600    # 1 hour default
    max_ttl     = 86400   # 24 hours maximum
    client_ttl  = 300     # 5 minutes for browsers

    # Cache key policy (what makes each cached object unique)
    cache_key_policy {
      include_host         = true
      include_protocol     = true
      include_query_string = true
    }
  }

  backend {
    group = google_compute_instance_group_manager.my_group.instance_group
  }

  health_checks = [google_compute_health_check.default.id]
}

# Backend bucket with Cloud CDN settings
resource "google_compute_backend_bucket" "static_assets" {
  name        = "static-assets-bucket"
  bucket_name = google_storage_bucket.static.name
  enable_cdn  = true

  cdn_policy {
    cache_mode  = "CACHE_ALL_STATIC"
    default_ttl = 86400   # 24 hours for static assets
    max_ttl     = 604800  # 7 days maximum
    client_ttl  = 3600    # 1 hour for browsers
  }
}
```

## Cache Mode Decision Guide

Choosing the right cache mode depends on your application.

### Use CACHE_ALL_STATIC when:
- Your origin serves a mix of static and dynamic content
- You want reasonable defaults without modifying origin headers
- You are serving a typical web application with HTML, CSS, JS, and images

### Use USE_ORIGIN_HEADERS when:
- Your origin already sends proper Cache-Control headers
- You need precise control over what gets cached
- You have content that should never be cached (user-specific data)
- Your application framework handles caching headers correctly

### Use FORCE_CACHE_ALL when:
- You are serving a fully static site
- Your origin does not send caching headers and you cannot change it
- You want maximum cache hit ratios and all content is safe to cache
- You are using Cloud CDN in front of a third-party origin you do not control

## How Origin Headers Interact with CDN TTLs

The interaction between origin headers and CDN settings can be confusing. Here is a breakdown.

With **CACHE_ALL_STATIC**:
- If origin sends Cache-Control max-age: use it, capped by max TTL
- If origin sends no caching headers and content is static: use default TTL
- If origin sends no-store or private: do not cache

With **USE_ORIGIN_HEADERS**:
- If origin sends Cache-Control max-age: use it, capped by max TTL
- If origin sends no caching headers: do not cache
- If origin sends no-store or private: do not cache

With **FORCE_CACHE_ALL**:
- If origin sends Cache-Control max-age: use it, capped by max TTL
- If origin sends no caching headers: use default TTL
- If origin sends no-store or private: ignore and cache anyway using default TTL

## Testing Your Cache Configuration

After configuring cache settings, verify they are working.

```bash
# Make a request and check the response headers
curl -I https://app.example.com/static/style.css

# Look for these headers in the response:
# X-Cache-Status: hit (or miss on first request)
# Age: <seconds since cached>
# Cache-Control: public, max-age=300 (client TTL)
```

You can also check cache behavior through Cloud Logging.

```bash
# Query CDN logs for cache hit/miss information
gcloud logging read \
    'resource.type="http_load_balancer" AND httpRequest.requestUrl:"style.css"' \
    --format="json(jsonPayload.statusDetails,jsonPayload.cacheHit)" \
    --limit=10 \
    --project=my-project
```

## Common Pitfalls

**Setting default TTL without changing cache mode**: Default TTL only applies to CACHE_ALL_STATIC and FORCE_CACHE_ALL modes. With USE_ORIGIN_HEADERS, default TTL is ignored.

**Forgetting client TTL**: If you set a long CDN TTL but no client TTL, browsers might cache stale content. Always set client TTL to a reasonable value.

**Vary header issues**: If your origin sends a Vary header with values Cloud CDN does not support, the response will not be cached. Cloud CDN supports Vary: Accept, Accept-Encoding, and Origin.

**Set-Cookie in responses**: By default, responses with Set-Cookie headers are not cached. If you want to cache them, you need to use FORCE_CACHE_ALL mode.

## Wrapping Up

Cache modes and TTL settings are the foundation of a well-performing Cloud CDN setup. Start with CACHE_ALL_STATIC and reasonable TTLs, monitor your cache hit ratios, and adjust from there. If you need more control, switch to USE_ORIGIN_HEADERS and configure your origin to send proper Cache-Control headers. And remember - the client TTL is just as important as the CDN TTL, since it determines how often browsers check back for fresh content.
