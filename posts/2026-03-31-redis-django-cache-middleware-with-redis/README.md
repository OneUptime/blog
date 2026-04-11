# How to Implement Django Cache Middleware with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Django, Middleware, Caching, Performance

Description: Learn how to use Django's built-in cache middleware with a Redis backend to cache entire page responses and improve response times for anonymous users.

---

Django's cache middleware stores full HTTP responses in a cache backend. When enabled with Redis, anonymous page requests are served directly from Redis without hitting Python code, views, or the database.

## Prerequisites

Install django-redis:

```bash
pip install django-redis
```

## Configure Redis as the Cache Backend

```python
# settings.py
CACHES = {
    "default": {
        "BACKEND": "django_redis.cache.RedisCache",
        "LOCATION": "redis://127.0.0.1:6379/0",
        "OPTIONS": {
            "CLIENT_CLASS": "django_redis.client.DefaultClient",
        },
        "KEY_PREFIX": "myapp",
    }
}
```

## Enable the Cache Middleware

Both middleware must be in the correct order:

```python
MIDDLEWARE = [
    "django.middleware.cache.UpdateCacheMiddleware",   # MUST be first
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.middleware.cache.FetchFromCacheMiddleware", # MUST be last
]

CACHE_MIDDLEWARE_ALIAS = "default"
CACHE_MIDDLEWARE_SECONDS = 600   # 10 minutes
CACHE_MIDDLEWARE_KEY_PREFIX = "page"
```

`UpdateCacheMiddleware` stores the response after the view runs. `FetchFromCacheMiddleware` returns the cached response before the view runs.

## Per-View Cache Control

Override the middleware TTL for specific views:

```python
from django.views.decorators.cache import cache_page, never_cache
from django.utils.decorators import method_decorator
from django.views import View

# Cache this view for 60 minutes
@cache_page(60 * 60)
def product_list(request):
    products = Product.objects.all()
    return render(request, "products/list.html", {"products": products})

# Never cache this view
@never_cache
def user_dashboard(request):
    return render(request, "dashboard.html")
```

For class-based views:

```python
@method_decorator(cache_page(60 * 30), name="dispatch")
class ArticleDetailView(View):
    def get(self, request, pk):
        article = Article.objects.get(pk=pk)
        return render(request, "article.html", {"article": article})
```

## Cache-Control Headers

Django cache middleware respects `Cache-Control` headers. Responses with `Cache-Control: private` will not be stored by the middleware. The `@never_cache` decorator sets `private` along with `no-cache`, `no-store`, and `must-revalidate` to fully prevent caching:

```python
from django.views.decorators.cache import cache_control

@cache_control(max_age=300, public=True)
def public_page(request):
    return render(request, "public.html")

@cache_control(private=True)
def private_page(request):
    return render(request, "private.html")
```

## Vary Header

Cache middleware creates separate cache entries per `Vary` header value:

```python
from django.views.decorators.vary import vary_on_cookie, vary_on_headers

@vary_on_headers("Accept-Language")
@cache_page(3600)
def localized_page(request):
    return render(request, "page.html")
```

## Invalidating the Cache

```python
from django.core.cache import cache

# Invalidate a specific page cache
# Django page cache keys follow a prefix pattern
cache.clear()  # clears all cache keys (use cautiously)

# Or use redis-py directly for pattern-based deletion
from django_redis import get_redis_connection
redis_con = get_redis_connection("default")
# Django page cache keys are stored as:
# <KEY_PREFIX>:<VERSION>:views.decorators.cache.cache_page.<CACHE_MIDDLEWARE_KEY_PREFIX>.*
keys = redis_con.keys("myapp:1:views.decorators.cache.cache_page.*")
if keys:
    redis_con.delete(*keys)
```

## Summary

Django's cache middleware with Redis caches full page responses, eliminating view and database execution for repeat requests. Place `UpdateCacheMiddleware` first and `FetchFromCacheMiddleware` last in `MIDDLEWARE`. Use `@cache_page` for per-view TTL overrides, `@never_cache` to opt out, and `Vary` decorators to create separate cache entries per content negotiation dimension.
