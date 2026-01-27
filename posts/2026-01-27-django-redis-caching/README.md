# How to Use Django Caching with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Django, Python, Redis, Caching, Performance

Description: Learn how to implement caching in Django applications using Redis, including cache backends, view caching, template caching, and cache invalidation strategies.

---

> Caching is one of the most effective ways to improve Django application performance. Redis, with its speed and versatility, is the preferred choice for production caching.

## Setting Up Redis as Django Cache Backend

### Install Dependencies

```bash
pip install django-redis redis
```

### Basic Configuration

Add Redis as your cache backend in `settings.py`:

```python
# settings.py

CACHES = {
    "default": {
        "BACKEND": "django_redis.cache.RedisCache",
        # Redis connection URL - format: redis://[:password]@host:port/db
        "LOCATION": "redis://127.0.0.1:6379/1",
        "OPTIONS": {
            "CLIENT_CLASS": "django_redis.client.DefaultClient",
        }
    }
}
```

### Multiple Cache Backends

Configure different caches for different purposes:

```python
# settings.py

CACHES = {
    # Default cache for general use
    "default": {
        "BACKEND": "django_redis.cache.RedisCache",
        "LOCATION": "redis://127.0.0.1:6379/1",
        "OPTIONS": {
            "CLIENT_CLASS": "django_redis.client.DefaultClient",
        }
    },
    # Separate cache for sessions with longer timeout
    "sessions": {
        "BACKEND": "django_redis.cache.RedisCache",
        "LOCATION": "redis://127.0.0.1:6379/2",
        "OPTIONS": {
            "CLIENT_CLASS": "django_redis.client.DefaultClient",
        },
        "TIMEOUT": 86400,  # 24 hours
    },
    # Cache for rate limiting with short timeout
    "ratelimit": {
        "BACKEND": "django_redis.cache.RedisCache",
        "LOCATION": "redis://127.0.0.1:6379/3",
        "OPTIONS": {
            "CLIENT_CLASS": "django_redis.client.DefaultClient",
        },
        "TIMEOUT": 60,  # 1 minute
    },
}
```

## Cache Configuration Options

```python
# settings.py

CACHES = {
    "default": {
        "BACKEND": "django_redis.cache.RedisCache",
        "LOCATION": "redis://127.0.0.1:6379/1",
        "OPTIONS": {
            "CLIENT_CLASS": "django_redis.client.DefaultClient",
            # Connection pool settings
            "CONNECTION_POOL_KWARGS": {
                "max_connections": 50,
                "retry_on_timeout": True,
            },
            # Serializer - pickle is default, can use json for debugging
            "SERIALIZER": "django_redis.serializers.pickle.PickleSerializer",
            # Compress data larger than 10KB
            "COMPRESSOR": "django_redis.compressors.zlib.ZlibCompressor",
            # Socket timeout in seconds
            "SOCKET_CONNECT_TIMEOUT": 5,
            "SOCKET_TIMEOUT": 5,
        },
        # Default timeout for cache entries (5 minutes)
        "TIMEOUT": 300,
        # Key prefix to avoid collisions with other apps
        "KEY_PREFIX": "myapp",
        # Version number for cache invalidation
        "VERSION": 1,
    }
}
```

## Low-Level Cache API

The cache API provides direct control over cached data.

### Basic Operations

```python
from django.core.cache import cache

# Set a value with default timeout
cache.set("user_123_profile", user_profile)

# Set with custom timeout (seconds)
cache.set("user_123_profile", user_profile, timeout=3600)

# Set with no expiration (use carefully)
cache.set("static_config", config_data, timeout=None)

# Get a value - returns None if not found
profile = cache.get("user_123_profile")

# Get with default value
profile = cache.get("user_123_profile", default={})

# Delete a value
cache.delete("user_123_profile")

# Check if key exists
if cache.has_key("user_123_profile"):
    print("Profile is cached")
```

### Advanced Operations

```python
from django.core.cache import cache

# Get or set pattern - avoid race conditions
def get_user_profile(user_id):
    key = f"user_{user_id}_profile"

    # Try to get from cache, compute if missing
    profile = cache.get_or_set(
        key,
        lambda: User.objects.get(id=user_id).profile,  # Only called if cache miss
        timeout=3600
    )
    return profile

# Bulk operations - more efficient than individual calls
keys = ["user_1_profile", "user_2_profile", "user_3_profile"]
profiles = cache.get_many(keys)  # Returns dict of found keys

# Set multiple values at once
cache.set_many({
    "user_1_profile": profile1,
    "user_2_profile": profile2,
    "user_3_profile": profile3,
}, timeout=3600)

# Delete multiple keys
cache.delete_many(keys)

# Increment/decrement counters atomically
cache.set("page_views", 0)
cache.incr("page_views")      # Now 1
cache.incr("page_views", 10)  # Now 11
cache.decr("page_views", 5)   # Now 6

# Add - only sets if key does not exist
added = cache.add("unique_key", "value", timeout=300)
if not added:
    print("Key already exists")
```

### Pattern-Based Key Operations

```python
from django.core.cache import cache

# Get the raw Redis client for advanced operations
from django_redis import get_redis_connection
redis_client = get_redis_connection("default")

# Find keys matching a pattern (use sparingly in production)
# Note: KEYS command can be slow on large datasets
keys = redis_client.keys("myapp:1:user_*")

# Delete all keys matching pattern
def delete_pattern(pattern):
    """Delete all cache keys matching pattern."""
    redis_client = get_redis_connection("default")
    keys = redis_client.keys(pattern)
    if keys:
        redis_client.delete(*keys)

# Example: Clear all user-related cache
delete_pattern("myapp:1:user_*")
```

## Per-View Caching with Decorators

### Cache Entire View Response

```python
from django.views.decorators.cache import cache_page
from django.views.decorators.vary import vary_on_headers, vary_on_cookie

# Cache view for 15 minutes
@cache_page(60 * 15)
def product_list(request):
    products = Product.objects.select_related("category").all()
    return render(request, "products/list.html", {"products": products})

# Cache varies by Accept-Language header
@cache_page(60 * 15)
@vary_on_headers("Accept-Language")
def localized_content(request):
    return render(request, "content.html")

# Cache varies by user session
@cache_page(60 * 15)
@vary_on_cookie
def user_dashboard(request):
    return render(request, "dashboard.html")
```

### Conditional View Caching

```python
from django.views.decorators.cache import cache_page
from functools import wraps

def cache_page_for_anonymous(timeout):
    """Only cache for anonymous users."""
    def decorator(view_func):
        @wraps(view_func)
        def wrapper(request, *args, **kwargs):
            if request.user.is_authenticated:
                # Skip cache for logged-in users
                return view_func(request, *args, **kwargs)
            # Apply caching for anonymous users
            cached_view = cache_page(timeout)(view_func)
            return cached_view(request, *args, **kwargs)
        return wrapper
    return decorator

@cache_page_for_anonymous(60 * 15)
def homepage(request):
    return render(request, "home.html")
```

### Class-Based View Caching

```python
from django.views.generic import ListView
from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_page

@method_decorator(cache_page(60 * 15), name="dispatch")
class ProductListView(ListView):
    model = Product
    template_name = "products/list.html"
    paginate_by = 20
```

## Template Fragment Caching

Cache expensive template sections independently.

```html
{% load cache %}

<!-- Cache product grid for 5 minutes -->
{% cache 300 product_grid %}
    <div class="products">
        {% for product in products %}
            <div class="product-card">
                <h3>{{ product.name }}</h3>
                <p>{{ product.price }}</p>
            </div>
        {% endfor %}
    </div>
{% endcache %}

<!-- Cache with dynamic key based on user -->
{% cache 300 user_sidebar request.user.id %}
    <aside class="sidebar">
        <h4>Welcome, {{ request.user.username }}</h4>
        <!-- User-specific content -->
    </aside>
{% endcache %}

<!-- Cache with multiple key fragments -->
{% cache 300 product_detail product.id product.updated_at %}
    <div class="product-detail">
        <!-- Complex product rendering -->
    </div>
{% endcache %}
```

## Per-Site Caching Middleware

Cache all responses site-wide for anonymous users.

```python
# settings.py

MIDDLEWARE = [
    # UpdateCacheMiddleware must be first
    "django.middleware.cache.UpdateCacheMiddleware",

    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",

    # FetchFromCacheMiddleware must be last
    "django.middleware.cache.FetchFromCacheMiddleware",
]

# Cache timeout for site-wide caching
CACHE_MIDDLEWARE_SECONDS = 600  # 10 minutes

# Key prefix for cache
CACHE_MIDDLEWARE_KEY_PREFIX = "site"

# Which cache backend to use
CACHE_MIDDLEWARE_ALIAS = "default"
```

### Exclude URLs from Site Cache

```python
# middleware.py

from django.middleware.cache import FetchFromCacheMiddleware, UpdateCacheMiddleware

class SelectiveCacheMiddleware(FetchFromCacheMiddleware):
    """Skip caching for certain URL patterns."""

    EXCLUDED_PATHS = [
        "/admin/",
        "/api/",
        "/accounts/",
    ]

    def process_request(self, request):
        # Skip cache for excluded paths
        for path in self.EXCLUDED_PATHS:
            if request.path.startswith(path):
                request._cache_update_cache = False
                return None
        return super().process_request(request)
```

## Cache Versioning and Prefixing

### Using Cache Versions

```python
# settings.py

CACHES = {
    "default": {
        "BACKEND": "django_redis.cache.RedisCache",
        "LOCATION": "redis://127.0.0.1:6379/1",
        # Increment VERSION to invalidate all cache at once
        "VERSION": 2,
        "KEY_PREFIX": "myapp",
    }
}
```

```python
from django.core.cache import cache

# Manually manage versions per key
cache.set("data", value, version=1)
cache.get("data", version=1)  # Returns value
cache.get("data", version=2)  # Returns None

# Increment version for a specific key
cache.incr_version("data")

# Useful for cache invalidation by type
class CacheManager:
    VERSIONS = {
        "products": 1,
        "categories": 1,
        "users": 1,
    }

    @classmethod
    def get(cls, key, cache_type):
        return cache.get(key, version=cls.VERSIONS.get(cache_type, 1))

    @classmethod
    def set(cls, key, value, cache_type, timeout=300):
        cache.set(key, value, timeout=timeout, version=cls.VERSIONS.get(cache_type, 1))

    @classmethod
    def invalidate_type(cls, cache_type):
        """Invalidate all cache of a certain type by incrementing version."""
        cls.VERSIONS[cache_type] = cls.VERSIONS.get(cache_type, 1) + 1
```

## Cache Invalidation Strategies

### Signal-Based Invalidation

```python
# signals.py

from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from django.core.cache import cache
from .models import Product, Category

@receiver([post_save, post_delete], sender=Product)
def invalidate_product_cache(sender, instance, **kwargs):
    """Clear product cache when product changes."""
    # Clear specific product cache
    cache.delete(f"product_{instance.id}")
    cache.delete(f"product_{instance.slug}")

    # Clear list caches
    cache.delete("product_list")
    cache.delete(f"category_{instance.category_id}_products")

@receiver([post_save, post_delete], sender=Category)
def invalidate_category_cache(sender, instance, **kwargs):
    """Clear category cache when category changes."""
    cache.delete(f"category_{instance.id}")
    cache.delete("category_list")

    # Clear all products in this category
    from django_redis import get_redis_connection
    redis_client = get_redis_connection("default")
    pattern = f"*category_{instance.id}_*"
    keys = redis_client.keys(pattern)
    if keys:
        redis_client.delete(*keys)
```

### Time-Based with Stale-While-Revalidate

```python
from django.core.cache import cache
import time

def get_with_stale_revalidate(key, compute_func, timeout=300, stale_timeout=60):
    """
    Return cached value, refreshing in background if stale.
    Prevents cache stampede by serving stale data while recomputing.
    """
    data = cache.get(key)

    if data is None:
        # Cache miss - compute and store
        value = compute_func()
        cache.set(key, {"value": value, "timestamp": time.time()}, timeout=timeout + stale_timeout)
        return value

    # Check if data is stale
    age = time.time() - data["timestamp"]
    if age > timeout:
        # Data is stale but still usable
        # Trigger background refresh (simplified - use Celery in production)
        cache.set(
            key,
            {"value": compute_func(), "timestamp": time.time()},
            timeout=timeout + stale_timeout
        )

    return data["value"]

# Usage
def get_product_stats():
    return get_with_stale_revalidate(
        "product_stats",
        lambda: calculate_expensive_stats(),
        timeout=300,
        stale_timeout=60
    )
```

### Cache Decorator with Automatic Invalidation

```python
from functools import wraps
from django.core.cache import cache
import hashlib

def cached_method(timeout=300, key_prefix=None):
    """
    Cache method results based on arguments.
    """
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            # Build cache key from function name and arguments
            prefix = key_prefix or func.__name__
            key_parts = [prefix]

            # Add args to key (skip self for methods)
            for arg in args[1:] if args else args:
                key_parts.append(str(arg))

            # Add kwargs to key
            for k, v in sorted(kwargs.items()):
                key_parts.append(f"{k}={v}")

            key = hashlib.md5(":".join(key_parts).encode()).hexdigest()

            # Try cache first
            result = cache.get(key)
            if result is not None:
                return result

            # Compute and cache
            result = func(*args, **kwargs)
            cache.set(key, result, timeout=timeout)
            return result

        # Allow manual cache invalidation
        wrapper.invalidate = lambda *args, **kwargs: cache.delete(
            hashlib.md5(":".join([key_prefix or func.__name__] +
                [str(a) for a in args] +
                [f"{k}={v}" for k, v in sorted(kwargs.items())]
            ).encode()).hexdigest()
        )

        return wrapper
    return decorator

# Usage
class ProductService:
    @cached_method(timeout=600, key_prefix="product")
    def get_product_with_details(self, product_id):
        return Product.objects.select_related("category").prefetch_related("tags").get(id=product_id)

# Invalidate specific cache
service = ProductService()
service.get_product_with_details.invalidate(123)
```

## Session Backend with Redis

Use Redis for session storage for better performance and scalability.

```python
# settings.py

# Use Redis for sessions
SESSION_ENGINE = "django.contrib.sessions.backends.cache"
SESSION_CACHE_ALIAS = "sessions"

# Or use django-redis session backend directly
SESSION_ENGINE = "django.contrib.sessions.backends.cached_db"

# Session settings
SESSION_COOKIE_AGE = 86400 * 7  # 1 week
SESSION_COOKIE_SECURE = True    # HTTPS only
SESSION_COOKIE_HTTPONLY = True  # No JavaScript access

# Alternative: dedicated session configuration
CACHES = {
    "default": {
        "BACKEND": "django_redis.cache.RedisCache",
        "LOCATION": "redis://127.0.0.1:6379/1",
    },
    "sessions": {
        "BACKEND": "django_redis.cache.RedisCache",
        "LOCATION": "redis://127.0.0.1:6379/2",
        "OPTIONS": {
            "CLIENT_CLASS": "django_redis.client.DefaultClient",
        },
        "TIMEOUT": 86400 * 7,  # Match SESSION_COOKIE_AGE
    }
}

SESSION_ENGINE = "django.contrib.sessions.backends.cache"
SESSION_CACHE_ALIAS = "sessions"
```

## Monitoring Cache Performance

### Cache Statistics

```python
from django_redis import get_redis_connection
from django.core.cache import cache

def get_cache_stats():
    """Get Redis cache statistics."""
    redis_client = get_redis_connection("default")
    info = redis_client.info()

    return {
        "used_memory": info["used_memory_human"],
        "connected_clients": info["connected_clients"],
        "total_keys": redis_client.dbsize(),
        "hits": info.get("keyspace_hits", 0),
        "misses": info.get("keyspace_misses", 0),
        "hit_rate": calculate_hit_rate(info),
        "evicted_keys": info.get("evicted_keys", 0),
    }

def calculate_hit_rate(info):
    """Calculate cache hit rate percentage."""
    hits = info.get("keyspace_hits", 0)
    misses = info.get("keyspace_misses", 0)
    total = hits + misses
    if total == 0:
        return 0
    return round((hits / total) * 100, 2)
```

### Cache Monitoring Middleware

```python
# middleware.py

import time
import logging
from django.core.cache import cache

logger = logging.getLogger("cache")

class CacheMonitoringMiddleware:
    """Log cache operations for monitoring."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Track cache operations during request
        request._cache_hits = 0
        request._cache_misses = 0
        request._cache_time = 0

        start = time.time()
        response = self.get_response(request)
        total_time = time.time() - start

        # Log cache statistics for the request
        logger.info(
            "Cache stats",
            extra={
                "path": request.path,
                "cache_hits": getattr(request, "_cache_hits", 0),
                "cache_misses": getattr(request, "_cache_misses", 0),
                "request_time_ms": round(total_time * 1000, 2),
            }
        )

        return response
```

### Health Check Endpoint

```python
# views.py

from django.http import JsonResponse
from django_redis import get_redis_connection
from django.core.cache import cache

def cache_health_check(request):
    """Health check endpoint for cache."""
    try:
        # Test write
        cache.set("health_check", "ok", timeout=10)

        # Test read
        value = cache.get("health_check")
        if value != "ok":
            return JsonResponse({"status": "error", "message": "Read verification failed"}, status=500)

        # Get stats
        redis_client = get_redis_connection("default")
        info = redis_client.info()

        return JsonResponse({
            "status": "healthy",
            "redis_version": info["redis_version"],
            "connected_clients": info["connected_clients"],
            "used_memory": info["used_memory_human"],
            "total_keys": redis_client.dbsize(),
        })
    except Exception as e:
        return JsonResponse({"status": "error", "message": str(e)}, status=500)
```

## Best Practices Summary

| Practice | Description |
|----------|-------------|
| **Choose appropriate timeouts** | Short for volatile data, longer for stable data |
| **Use key prefixes** | Prevent collisions between apps and environments |
| **Implement cache warming** | Pre-populate cache for predictable high-traffic events |
| **Monitor hit rates** | Track effectiveness and adjust strategies accordingly |
| **Use connection pooling** | Reuse connections for better performance |
| **Handle cache failures gracefully** | Fall back to database when Redis is unavailable |
| **Invalidate surgically** | Clear only affected keys, not entire cache |
| **Compress large values** | Reduce memory usage and network transfer |
| **Use versioning** | Enable easy invalidation of entire cache segments |
| **Separate cache backends** | Different Redis databases for sessions, rate limits, and data |

Redis caching in Django dramatically improves application performance when implemented thoughtfully. Start with view caching for quick wins, then progress to granular fragment and low-level caching as you identify bottlenecks. Always monitor cache effectiveness and adjust invalidation strategies based on your data's change frequency.

For production monitoring of your Django applications and Redis infrastructure, [OneUptime](https://oneuptime.com) provides comprehensive observability with real-time metrics, alerting, and distributed tracing.
