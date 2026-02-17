# How to Invalidate Cached Content in Google Cloud CDN Using Cache Tags

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud CDN, Cache Invalidation, Cache Tags, Content Delivery

Description: Learn how to use cache tags and cache invalidation in Google Cloud CDN to selectively purge cached content when your origin content changes.

---

Cache invalidation is one of the hardest problems in computer science, and CDNs make it even trickier. When you update content on your origin, stale versions might sit in Cloud CDN's edge caches until the TTL expires. Sometimes you cannot wait for that - you need the new version served immediately. Cloud CDN provides cache invalidation to force-purge content, and cache tags let you do it surgically instead of blowing away your entire cache.

This guide covers both basic cache invalidation and tag-based invalidation in Cloud CDN.

## Understanding Cache Invalidation

When you invalidate content in Cloud CDN, you are telling the CDN to treat the specified cached objects as stale. The next request for those objects will go to the origin to fetch a fresh copy. It is important to understand that invalidation does not immediately delete content from all edge caches - it marks it as invalid so that the next request triggers a refetch.

There are two approaches to invalidation:

1. **URL-based invalidation**: Invalidate specific URLs or URL patterns
2. **Tag-based invalidation**: Invalidate all content tagged with a specific label

## URL-Based Cache Invalidation

The simplest form of invalidation targets a specific URL path.

```bash
# Invalidate a specific URL path
gcloud compute url-maps invalidate-cdn-cache my-url-map \
    --path="/images/logo.png" \
    --project=my-project

# Invalidate all paths under a prefix
gcloud compute url-maps invalidate-cdn-cache my-url-map \
    --path="/images/*" \
    --project=my-project

# Invalidate everything
gcloud compute url-maps invalidate-cdn-cache my-url-map \
    --path="/*" \
    --project=my-project
```

URL-based invalidation works well for one-off changes, but it becomes unwieldy when you need to invalidate a large number of unrelated URLs. That is where cache tags come in.

## How Cache Tags Work

Cache tags let you label cached responses with arbitrary tags. When you need to invalidate content, you can purge all responses with a specific tag in a single operation, regardless of their URLs.

The process works like this:

1. Your origin adds a `Cache-Tag` header to responses
2. Cloud CDN stores the tags along with the cached response
3. When you need to invalidate, you specify a tag and Cloud CDN purges all responses with that tag

### Setting Cache Tags on the Origin

Your origin server needs to include the `Cache-Tag` header in responses. You can include multiple tags separated by commas.

Here is an example with Nginx.

```nginx
# nginx.conf - Add cache tags based on content type and category
server {
    location /products/ {
        # Tag all product pages with their category
        add_header Cache-Tag "products, product-catalog";
        proxy_pass http://backend;
    }

    location /blog/ {
        # Tag blog content
        add_header Cache-Tag "blog, content";
        proxy_pass http://backend;
    }

    location /images/ {
        # Tag images by type
        add_header Cache-Tag "images, static-assets";
        proxy_pass http://backend;
    }
}
```

For a dynamic application, you can set tags programmatically. Here is a Node.js Express example.

```javascript
// Express middleware that sets cache tags based on the content
app.use('/api/products/:id', (req, res, next) => {
  const productId = req.params.id;
  const category = getProductCategory(productId);

  // Set multiple cache tags for granular invalidation
  res.set('Cache-Tag', `product-${productId}, category-${category}, products`);

  // Set caching headers
  res.set('Cache-Control', 'public, max-age=3600');

  next();
});

app.use('/api/blog/:slug', (req, res, next) => {
  const slug = req.params.slug;
  const author = getPostAuthor(slug);

  // Tag by post, author, and content type
  res.set('Cache-Tag', `post-${slug}, author-${author}, blog`);
  res.set('Cache-Control', 'public, max-age=7200');

  next();
});
```

### Tag Naming Strategy

Good cache tag naming makes invalidation easy. Here is a strategy that works well:

- **Type tags**: `products`, `blog`, `images` - broad categories
- **Instance tags**: `product-123`, `post-hello-world` - specific items
- **Relationship tags**: `category-electronics`, `author-john` - related groups
- **Version tags**: `v2`, `release-3.1` - deployment versions

This lets you invalidate at different granularity levels. Update a single product? Invalidate `product-123`. Update all electronics? Invalidate `category-electronics`. Deploy a new version? Invalidate `v2`.

## Invalidating by Cache Tag

Once your origin is sending cache tags, you can invalidate by tag.

```bash
# Invalidate all content tagged with "products"
gcloud compute url-maps invalidate-cdn-cache my-url-map \
    --tags="products" \
    --project=my-project

# Invalidate by a specific product tag
gcloud compute url-maps invalidate-cdn-cache my-url-map \
    --tags="product-123" \
    --project=my-project

# Invalidate multiple tags at once
gcloud compute url-maps invalidate-cdn-cache my-url-map \
    --tags="category-electronics,category-accessories" \
    --project=my-project
```

### Using the REST API

For programmatic invalidation, use the REST API.

```bash
# Invalidate by tag using the REST API
curl -X POST \
    "https://compute.googleapis.com/compute/v1/projects/my-project/global/urlMaps/my-url-map/invalidateCache" \
    -H "Authorization: Bearer $(gcloud auth print-access-token)" \
    -H "Content-Type: application/json" \
    -d '{
        "cacheTags": ["products", "homepage"]
    }'
```

### Automating Invalidation in CI/CD

Add cache invalidation to your deployment pipeline so that cached content is refreshed whenever you deploy.

```yaml
# cloudbuild.yaml - Include cache invalidation in your deployment
steps:
  # Build and deploy your application
  - name: 'gcr.io/cloud-builders/gcloud'
    args: ['app', 'deploy']

  # Invalidate CDN cache after deployment
  - name: 'gcr.io/cloud-builders/gcloud'
    args:
      - 'compute'
      - 'url-maps'
      - 'invalidate-cdn-cache'
      - 'my-url-map'
      - '--tags=v${BUILD_ID}'
      - '--project=my-project'
```

## Invalidation Limits and Best Practices

Cloud CDN has limits on cache invalidation that you should be aware of:

- You can submit one invalidation request per minute per URL map
- Each invalidation can target a path pattern or tags
- Invalidation propagation takes a few minutes to reach all edge locations

### Best Practices

**Use versioned URLs when possible.** Instead of invalidating `/style.css`, use `/style.v42.css`. This avoids invalidation entirely because the new version is a new cache entry.

```html
<!-- Use content hashing in file names to avoid invalidation -->
<link rel="stylesheet" href="/static/style.a3f8b2c1.css">
<script src="/static/app.e7d9f4a2.js"></script>
```

**Reserve invalidation for emergencies.** Tag-based invalidation is great for when you really need to purge content fast, but day-to-day content updates should rely on TTLs and versioned URLs.

**Keep tag counts reasonable.** Each response can have multiple tags, but do not go overboard. A handful of well-chosen tags per response is better than dozens of micro-tags.

**Monitor cache hit ratios after invalidation.** A large invalidation temporarily drops your cache hit ratio. Monitor it to make sure it recovers.

```bash
# Check cache hit ratios in Cloud Monitoring after invalidation
gcloud logging read \
    'resource.type="http_load_balancer" AND timestamp>="2026-02-17T00:00:00Z"' \
    --format="json(jsonPayload.cacheHit)" \
    --limit=100 \
    --project=my-project
```

## Terraform Configuration

Configure cache tags support in your Terraform setup.

```hcl
# Backend service with CDN and cache tag support
resource "google_compute_backend_service" "cdn_backend" {
  name                  = "cdn-backend"
  protocol              = "HTTP"
  port_name             = "http"
  enable_cdn            = true
  load_balancing_scheme = "EXTERNAL"

  cdn_policy {
    cache_mode  = "USE_ORIGIN_HEADERS"
    default_ttl = 3600
    max_ttl     = 86400

    # Cloud CDN automatically reads Cache-Tag headers from origin responses
    # No additional configuration needed for tag support
  }

  backend {
    group = google_compute_instance_group_manager.web.instance_group
  }

  health_checks = [google_compute_health_check.default.id]
}
```

## Verifying Cache Tags

To verify that cache tags are being set correctly, check the origin response headers.

```bash
# Bypass CDN and check origin directly for cache tags
curl -I https://origin.example.com/products/123

# Expected headers:
# Cache-Tag: product-123, category-electronics, products
# Cache-Control: public, max-age=3600
```

Note that Cloud CDN strips the `Cache-Tag` header from responses sent to clients. The tags are only used internally for invalidation purposes.

## Wrapping Up

Cache tags transform cache invalidation from a blunt instrument into a precision tool. Instead of invalidating entire path prefixes and nuking your cache hit ratio, you can target exactly the content that changed. The key is investing a little time upfront in a good tagging strategy - name your tags consistently, tag at multiple granularity levels, and integrate invalidation into your deployment pipeline. With that in place, your content stays fresh and your cache stays warm.
