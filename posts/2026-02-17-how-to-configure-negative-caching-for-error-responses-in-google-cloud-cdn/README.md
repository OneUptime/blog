# How to Configure Negative Caching for Error Responses in Google Cloud CDN

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud CDN, Negative Caching, Error Handling, Content Delivery

Description: Learn how to configure negative caching in Google Cloud CDN to cache error responses and reduce origin load during failures or missing content scenarios.

---

When your origin returns an error - a 404 Not Found, a 500 Internal Server Error, or any other error status code - Cloud CDN can cache that error response for a short time instead of forwarding every subsequent request to your already-struggling origin. This is called negative caching, and it is one of those features that does not seem important until your origin starts failing under load and every error request makes things worse.

In this guide, I will explain how negative caching works, how to configure it, and when to use or avoid it.

## Why Negative Caching Matters

Consider this scenario: your origin server starts returning 500 errors because of a database connection issue. Without negative caching, every single request still goes to the origin, which is already overloaded. The CDN provides zero relief because it does not cache error responses.

With negative caching enabled, Cloud CDN caches the 500 response for a short period (say, 30 seconds). During that window, subsequent requests get the cached error without hitting the origin. This gives the origin breathing room to recover.

The same logic applies to 404 errors. If a user shares a broken link and it goes viral, thousands of requests for a non-existent resource hammer your origin. Caching the 404 response stops the flood.

## Default Behavior

By default, Cloud CDN has some built-in negative caching behavior:

- 404 responses are cached for 120 seconds
- 405 and 410 responses are cached for 120 seconds
- Other error codes (5xx, 403, etc.) are not cached by default

You can override these defaults or add caching for additional status codes.

## Step 1: Enable Negative Caching

Enable negative caching on your backend service with the default settings.

```bash
# Enable negative caching with default TTLs
gcloud compute backend-services update my-backend \
    --negative-caching \
    --global \
    --project=my-project
```

This enables negative caching with Cloud CDN's default policy, which caches 404, 405, and 410 responses for 120 seconds.

## Step 2: Configure Custom Negative Caching Policies

To customize which status codes are cached and for how long, use the `--negative-caching-policy` flag.

```bash
# Set custom negative caching for specific status codes
gcloud compute backend-services update my-backend \
    --negative-caching \
    --negative-caching-policy='[{"code":404,"ttl":60},{"code":405,"ttl":60},{"code":500,"ttl":10},{"code":502,"ttl":10},{"code":503,"ttl":10}]' \
    --global \
    --project=my-project
```

This configuration:
- Caches 404 responses for 60 seconds
- Caches 405 responses for 60 seconds
- Caches 500, 502, and 503 responses for 10 seconds

The TTLs for error responses should be much shorter than for successful responses. You want to protect the origin from thundering herd problems, not serve stale errors for hours.

## Step 3: Configure with Terraform

Here is the Terraform configuration for negative caching.

```hcl
# Backend service with negative caching configuration
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

    # Enable negative caching
    negative_caching = true

    # Custom TTLs for specific error codes
    negative_caching_policy {
      code = 404
      ttl  = 60
    }
    negative_caching_policy {
      code = 410
      ttl  = 120
    }
    negative_caching_policy {
      code = 500
      ttl  = 10
    }
    negative_caching_policy {
      code = 502
      ttl  = 10
    }
    negative_caching_policy {
      code = 503
      ttl  = 15
    }
  }

  backend {
    group = google_compute_instance_group_manager.web.instance_group
  }

  health_checks = [google_compute_health_check.default.id]
}
```

## Step 4: Choosing TTLs for Different Error Codes

Different error codes call for different caching strategies.

### 404 Not Found

Cache for 30-120 seconds. This protects against broken link floods while allowing new content to become available relatively quickly.

### 410 Gone

Cache for 120-3600 seconds. The resource is permanently removed, so a longer cache time is appropriate.

### 500 Internal Server Error

Cache for 5-15 seconds. Just enough to absorb a traffic spike during an outage, but short enough that recovery is noticed quickly.

### 502 Bad Gateway

Cache for 5-15 seconds. Similar to 500 - temporary protection during upstream failures.

### 503 Service Unavailable

Cache for 10-30 seconds. If the origin is intentionally returning 503 (rate limiting, maintenance), a slightly longer TTL helps.

### 403 Forbidden

Be careful with this one. Caching a 403 could prevent legitimate users from accessing content after a permissions change. If you cache it, keep the TTL very short (5-10 seconds).

## Step 5: Disable Negative Caching When Needed

There are situations where negative caching can cause problems. To disable it:

```bash
# Disable negative caching
gcloud compute backend-services update my-backend \
    --no-negative-caching \
    --global \
    --project=my-project
```

## When NOT to Use Negative Caching

**Dynamic error pages with user context**: If your error pages contain user-specific information (like a personalized 404 page showing recommended content), caching them would show one user's personalized content to another.

**Authentication-dependent resources**: If a 403 response depends on the user's authentication state, caching it would block authenticated users from accessing the resource.

**Rapidly changing content**: If content is being created in real-time and 404s should resolve within seconds, even a short cache TTL could cause visible delays.

## Step 6: Monitor Negative Caching

Monitor negative caching behavior to make sure it is working as expected and not causing user-facing issues.

```bash
# Check for cached error responses in logs
gcloud logging read \
    'resource.type="http_load_balancer" AND httpRequest.status>=400 AND jsonPayload.cacheHit=true' \
    --format="table(timestamp,httpRequest.requestUrl,httpRequest.status)" \
    --limit=20 \
    --project=my-project
```

This query shows requests where an error response was served from cache, which confirms negative caching is working.

```bash
# Check the volume of cached errors vs origin errors
gcloud logging read \
    'resource.type="http_load_balancer" AND httpRequest.status>=400' \
    --format="value(jsonPayload.cacheHit)" \
    --limit=1000 \
    --project=my-project | sort | uniq -c
```

## Step 7: Combine with Cache Invalidation

If you publish new content that was previously returning 404, you might want to invalidate the cached 404 response so the new content is served immediately.

```bash
# Invalidate a cached 404 response for a specific path
gcloud compute url-maps invalidate-cdn-cache my-url-map \
    --path="/blog/new-post" \
    --project=my-project
```

## Custom Error Pages

If you want Cloud CDN to serve a custom error page when the origin returns certain errors, combine negative caching with custom error response rules in the URL map.

```bash
# Configure a custom error response in the URL map
gcloud compute url-maps edit my-url-map --project=my-project
```

Add the custom error response to the URL map configuration:

```yaml
# Custom error responses in the URL map
defaultRouteAction:
  faultInjectionPolicy: {}
defaultService: projects/my-project/global/backendServices/cdn-backend
defaultCustomErrorResponsePolicy:
  errorResponseRules:
    - matchResponseCodes:
        - '404'
      path: '/errors/404.html'
      overrideResponseCode: 404
    - matchResponseCodes:
        - '500'
        - '502'
        - '503'
      path: '/errors/500.html'
      overrideResponseCode: 503
  errorService: projects/my-project/global/backendBuckets/error-pages-bucket
```

## Performance Impact

Negative caching has a measurable impact on origin load during error scenarios:

| Scenario | Without Negative Caching | With Negative Caching (10s TTL) |
|----------|------------------------|-------------------------------|
| 1000 requests/sec to 404 | 1000 req/sec to origin | ~100 req/sec to origin |
| Origin returning 500 | All requests hit origin | Origin gets breathing room |
| Broken link goes viral | Full traffic spike to origin | Spike absorbed by CDN |

The reduction depends on the TTL and the request rate. Even a 10-second TTL provides significant relief during a traffic spike.

## Wrapping Up

Negative caching is a simple but powerful feature that protects your origin from being overwhelmed by error traffic. The configuration takes a few minutes, and the payoff is significant during outages and traffic spikes. Keep TTLs short for server errors (5-15 seconds) so recovery is detected quickly, and use moderate TTLs for client errors like 404 (30-120 seconds). Monitor your cached error responses to make sure you are not accidentally serving stale errors to users who should be getting fresh content.
