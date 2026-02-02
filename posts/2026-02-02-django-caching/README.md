# How to Add Caching to Django Applications

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Python, Django, Caching, Redis, Performance

Description: Learn how to implement caching in Django using the cache framework, Redis, view caching, template fragment caching, and cache invalidation strategies.

---

> Every millisecond counts when your users are waiting for a page to load. Caching is one of the most effective ways to speed up Django applications by storing expensive computations and database queries for later reuse.

If your Django app is hitting the database for the same data on every request, you're wasting resources. Caching lets you store results and serve them instantly on subsequent requests.

---

## Choosing a Cache Backend

Django supports multiple cache backends out of the box. Pick one based on your needs:

| Backend | Persistence | Speed | Best For |
|---------|-------------|-------|----------|
| **Memcached** | No | Very Fast | Production, distributed |
| **Redis** | Yes | Very Fast | Production, need persistence |
| **Database** | Yes | Slower | Simple setups, already have DB |
| **File-based** | Yes | Slow | Development, low traffic |
| **Local Memory** | No | Fastest | Single process, development |

---

## Configuring Cache Backends

Add your cache configuration to `settings.py`. Here are the most common setups:

### Redis (Recommended for Production)

```python
# settings.py
CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.redis.RedisCache",
        "LOCATION": "redis://127.0.0.1:6379/1",
        "OPTIONS": {
            "CLIENT_CLASS": "django_redis.client.DefaultClient",
        },
        "KEY_PREFIX": "myapp",  # Prefix all keys to avoid collisions
        "TIMEOUT": 300,  # Default timeout: 5 minutes
    }
}
```

### Memcached

```python
# settings.py
CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.memcached.PyMemcacheCache",
        "LOCATION": "127.0.0.1:11211",
    }
}
```

### Local Memory (Development Only)

```python
# settings.py
CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
        "LOCATION": "unique-snowflake",
    }
}
```

---

## Low-Level Cache API

The low-level API gives you full control over what gets cached and for how long.

```python
# views.py
from django.core.cache import cache
from django.http import JsonResponse
from .models import Product

def get_popular_products(request):
    # Try to get cached data first
    cache_key = "popular_products"
    products = cache.get(cache_key)

    if products is None:
        # Cache miss - fetch from database
        products = list(
            Product.objects.filter(is_popular=True)
            .values("id", "name", "price")[:20]
        )
        # Store in cache for 10 minutes
        cache.set(cache_key, products, timeout=600)

    return JsonResponse({"products": products})
```

### Common Cache Operations

```python
from django.core.cache import cache

# Set a value with timeout (seconds)
cache.set("my_key", "my_value", timeout=300)

# Get a value (returns None if not found)
value = cache.get("my_key")

# Get with default value
value = cache.get("my_key", default="fallback")

# Delete a key
cache.delete("my_key")

# Set multiple values at once
cache.set_many({"key1": "val1", "key2": "val2"}, timeout=300)

# Get multiple values
values = cache.get_many(["key1", "key2"])

# Increment/decrement counters
cache.set("hits", 0)
cache.incr("hits")  # Now 1
cache.decr("hits")  # Back to 0

# Add only if key doesn't exist
cache.add("unique_key", "value", timeout=300)  # Returns True if added

# Get or set pattern
def expensive_computation():
    return sum(range(1000000))

result = cache.get_or_set("computation_result", expensive_computation, timeout=3600)
```

---

## Per-View Caching

The easiest way to cache entire views. Django handles the cache key generation automatically.

```python
# views.py
from django.views.decorators.cache import cache_page
from django.http import JsonResponse

# Cache this view for 15 minutes
@cache_page(60 * 15)
def product_list(request):
    products = Product.objects.all()
    return JsonResponse({"products": list(products.values())})
```

### Caching with URL Parameters

The cache key includes query parameters by default, so `/products/?page=1` and `/products/?page=2` are cached separately.

```python
# views.py
from django.views.decorators.cache import cache_page
from django.views.decorators.vary import vary_on_headers

# Cache separately for different Accept-Language headers
@vary_on_headers("Accept-Language")
@cache_page(60 * 15)
def localized_content(request):
    # Content varies by language
    return render(request, "content.html")
```

### Caching Class-Based Views

```python
# views.py
from django.views.generic import ListView
from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_page

@method_decorator(cache_page(60 * 15), name="dispatch")
class ProductListView(ListView):
    model = Product
    template_name = "products/list.html"
```

---

## Template Fragment Caching

Cache expensive template sections without caching the entire page.

```html
<!-- templates/products/list.html -->
{% load cache %}

<h1>Products</h1>

<!-- Cache the sidebar for 5 minutes -->
{% cache 300 sidebar %}
    <div class="sidebar">
        {% for category in categories %}
            <a href="{{ category.url }}">{{ category.name }}</a>
        {% endfor %}
    </div>
{% endcache %}

<!-- Cache per user - include user.id in cache key -->
{% cache 300 user_recommendations user.id %}
    <div class="recommendations">
        {% for product in recommended_products %}
            <div class="product">{{ product.name }}</div>
        {% endfor %}
    </div>
{% endcache %}
```

---

## Cache Invalidation Strategies

Cache invalidation is the hard part. Here are practical approaches:

### Signal-Based Invalidation

Clear related caches when models change:

```python
# signals.py
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from django.core.cache import cache
from .models import Product

@receiver([post_save, post_delete], sender=Product)
def invalidate_product_cache(sender, instance, **kwargs):
    # Clear specific product cache
    cache.delete(f"product_{instance.id}")

    # Clear list caches
    cache.delete("popular_products")
    cache.delete("all_products")

    # Clear category-specific cache
    cache.delete(f"category_{instance.category_id}_products")
```

### Versioned Cache Keys

Invalidate by bumping a version number:

```python
# cache_utils.py
from django.core.cache import cache

def get_cache_version(key_prefix):
    """Get current version for a cache key prefix"""
    version_key = f"{key_prefix}_version"
    version = cache.get(version_key)
    if version is None:
        version = 1
        cache.set(version_key, version, timeout=None)
    return version

def invalidate_cache_version(key_prefix):
    """Bump version to invalidate all related keys"""
    version_key = f"{key_prefix}_version"
    try:
        cache.incr(version_key)
    except ValueError:
        cache.set(version_key, 1, timeout=None)

def versioned_cache_key(key_prefix, identifier):
    """Generate a versioned cache key"""
    version = get_cache_version(key_prefix)
    return f"{key_prefix}_v{version}_{identifier}"
```

Usage:

```python
# views.py
from .cache_utils import versioned_cache_key, invalidate_cache_version

def get_product(request, product_id):
    cache_key = versioned_cache_key("product", product_id)
    product = cache.get(cache_key)

    if product is None:
        product = Product.objects.get(id=product_id)
        cache.set(cache_key, product, timeout=3600)

    return JsonResponse({"product": product.to_dict()})

# When products change, invalidate all product caches at once
def update_products_bulk(request):
    # ... do bulk update ...
    invalidate_cache_version("product")
    return JsonResponse({"status": "updated"})
```

---

## Caching Database Queries with select_related

Combine caching with query optimization:

```python
# views.py
from django.core.cache import cache

def get_order_details(request, order_id):
    cache_key = f"order_details_{order_id}"
    order_data = cache.get(cache_key)

    if order_data is None:
        # Optimize query to reduce database hits
        order = (
            Order.objects
            .select_related("customer", "shipping_address")
            .prefetch_related("items__product")
            .get(id=order_id)
        )

        order_data = {
            "id": order.id,
            "customer": order.customer.name,
            "items": [
                {"product": item.product.name, "quantity": item.quantity}
                for item in order.items.all()
            ],
        }
        cache.set(cache_key, order_data, timeout=300)

    return JsonResponse(order_data)
```

---

## Testing with Caching

Disable caching in tests to avoid flaky results:

```python
# settings/test.py
CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.dummy.DummyCache",
    }
}
```

Or clear cache between tests:

```python
# tests.py
from django.test import TestCase
from django.core.cache import cache

class ProductCacheTest(TestCase):
    def setUp(self):
        cache.clear()

    def tearDown(self):
        cache.clear()

    def test_product_is_cached(self):
        # First call hits database
        response = self.client.get("/products/1/")
        self.assertEqual(response.status_code, 200)

        # Verify it's now cached
        cached = cache.get("product_1")
        self.assertIsNotNone(cached)
```

---

## Quick Wins

1. Start with per-view caching on read-heavy pages
2. Use Redis in production - it's battle-tested and supports persistence
3. Always set timeouts - infinite caches lead to stale data
4. Monitor cache hit rates to measure effectiveness
5. Use cache key prefixes to avoid collisions between apps

Caching doesn't have to be complicated. Start with the views that hit your database the hardest, measure the improvement, and expand from there.
