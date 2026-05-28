# How to Configure Negative Caching for Error Responses in Google Cloud CDN

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud CDN, Negative Caching, Error Handling, Content Delivery

Description: Learn how to configure negative caching in Google Cloud CDN to cache error responses and reduce origin load during failures or missing content scenarios.

---

When your origin returns a cacheable error - such as a 404 Not Found, a 410 Gone, or a 501 Not Implemented - Cloud CDN can cache that error response for a short time instead of forwarding every subsequent request to your already-struggling origin. This is called negative caching, and it is one of those features that does not seem important until your origin starts failing under load and every error request makes things worse.

In this guide, I will explain how negative caching works, how to configure it, and when to use or avoid it.

## Why Negative Caching Matters

Consider this scenario: users start requesting a missing page because of a broken link in a popular campaign. Without negative caching, every single request still goes to the origin, even though the response is the same 404. The CDN provides zero relief because it does not cache the error response.

With negative caching enabled, Cloud CDN caches the 404 response for a short period (say, 60 seconds). During that window, subsequent requests get the cached error without hitting the origin. This gives the origin breathing room.

The same logic applies to 404 errors. If a user shares a broken link and it goes viral, thousands of requests for a non-existent resource hammer your origin. Caching the 404 response stops the flood.

## Default Behavior

By default, Cloud CDN has some built-in negative caching behavior:

- 404 responses are cached for 120 seconds
- 405 responses are cached for 60 seconds
- 410, 451, and 501 responses are cached for 120, 120, and 60 seconds respectively
- 300, 301, and 308 redirects are cached for 10 minutes
- 302 and 307 redirects are supported by negative caching, but are not cached by default
- Other error codes (500, 502, 503, 403, etc.) are not supported by Cloud CDN negative caching

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

This enables negative caching with Cloud CDN's default policy, including 404 responses for 120 seconds, 405 and 501 responses for 60 seconds, 410 and 451 responses for 120 seconds, and 300, 301, and 308 redirects for 10 minutes.

## Step 2: Configure Custom Negative Caching Policies

To customize which status codes are cached and for how long, use the `--negative-caching-policy` flag.

```bash
# Set custom negative caching for specific status codes
gcloud compute backend-services update my-backend \
    --negative-caching \
    --negative-caching-policy='404=60,405=60,410=120,451=120,501=60' \
    --global \
    --project=my-project
```

This configuration:
- Caches 404 responses for 60 seconds
- Caches 405 responses for 60 seconds
- Caches 410 and 451 responses for 120 seconds
- Caches 501 responses for 60 seconds

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
      code = 451
      ttl  = 120
    }
    negative_caching_policy {
      code = 501
      ttl  = 60
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

Cache for 120-1800 seconds. The resource is permanently removed, so a longer cache time is appropriate, but Cloud CDN negative caching TTLs are limited to 1800 seconds.

### 451 Unavailable For Legal Reasons

Cache for 120-1800 seconds if the restriction is expected to be stable. Keep the TTL shorter if the legal or policy state changes frequently.

### 501 Not Implemented

Cache for 30-120 seconds. This is the only 5xx status code supported by Cloud CDN negative caching policy.

### 500, 502, and 503 Server Errors

Cloud CDN negative caching policy does not support these status codes. If you need resilience during backend failures, look at serve-while-stale, origin caching headers where appropriate, or custom error response handling instead.

### 403 Forbidden

Cloud CDN negative caching policy does not support 403 responses. Be careful with caching authorization-dependent responses in general, because a cached 403 could prevent legitimate users from accessing content after a permissions change.

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
    'resource.type="http_load_balancer" AND httpRequest.status>=400 AND httpRequest.cacheHit=true' \
    --format="table(timestamp,httpRequest.requestUrl,httpRequest.status)" \
    --limit=20 \
    --project=my-project
```

This query shows requests where an error response was served from cache, which confirms negative caching is working.

```bash
# Check the volume of cached errors vs origin errors
gcloud logging read \
    'resource.type="http_load_balancer" AND httpRequest.status>=400' \
    --format="value(httpRequest.cacheHit)" \
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

If you want Cloud CDN to serve a custom error page when the origin returns certain errors, combine custom error response rules in the URL map with a negative caching policy for the supported status codes you want to cache.

```bash
# Configure a custom error response in the URL map
gcloud compute url-maps edit my-url-map --project=my-project
```

Add the custom error response to the URL map configuration:

```yaml
# Custom error responses in the URL map
defaultService: https://www.googleapis.com/compute/v1/projects/my-project/global/backendServices/cdn-backend
defaultCustomErrorResponsePolicy:
  errorResponseRules:
    - matchResponseCodes:
        - 404
      path: '/errors/404.html'
      overrideResponseCode: 404
    - matchResponseCodes:
        - 501
      path: '/errors/501.html'
      overrideResponseCode: 501
  errorService: https://www.googleapis.com/compute/v1/projects/my-project/global/backendBuckets/error-pages-bucket
```

## Performance Impact

Negative caching has a measurable impact on origin load during error scenarios:

| Scenario | Without Negative Caching | With Negative Caching |
|----------|------------------------|-------------------------------|
| 1000 requests/sec to 404 | 1000 req/sec to origin | About one cache fill per cache key, per edge, during each TTL window |
| Origin returning 501 | All requests hit origin | Repeated requests for the same cache key can be served from cache |
| Broken link goes viral | Full traffic spike to origin | Spike absorbed by CDN |

The reduction depends on the TTL, request rate, cache key, and which edge caches receive traffic. Even a short TTL provides significant relief during a traffic spike.

## Wrapping Up

Negative caching is a simple but powerful feature that protects your origin from being overwhelmed by repeated cacheable error traffic. The configuration takes a few minutes, and the payoff is significant during traffic spikes. Use moderate TTLs for client errors like 404 (30-120 seconds), remember that Cloud CDN negative caching supports only specific status codes, and monitor your cached error responses to make sure you are not accidentally serving stale errors to users who should be getting fresh content.
