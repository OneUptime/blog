# How to Cache Django REST Framework Responses with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Django, REST Framework, Caching, API

Description: Learn how to cache Django REST Framework API responses with Redis using cache_page, custom decorators, and method-level caching for read-heavy endpoints.

---

Read-heavy DRF APIs benefit enormously from Redis caching. This guide covers four approaches: Django's `cache_page`, DRF's built-in method decoration, custom response caching, and cache invalidation on writes.

## Setup

```bash
pip install django-redis djangorestframework
```

```python
# settings.py
CACHES = {
    "default": {
        "BACKEND": "django_redis.cache.RedisCache",
        "LOCATION": "redis://127.0.0.1:6379/0",
        "OPTIONS": {"CLIENT_CLASS": "django_redis.client.DefaultClient"},
        "KEY_PREFIX": "drf",
    }
}
```

## Using cache_page on APIView

```python
from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_page
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

@method_decorator(cache_page(60 * 15), name="dispatch")  # 15 min
class ProductListView(APIView):
    def get(self, request):
        products = Product.objects.select_related("category").all()
        serializer = ProductSerializer(products, many=True)
        return Response(serializer.data)
```

## ViewSet with Selective Caching

Cache only read actions:

```python
from rest_framework import viewsets
from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_page, never_cache

class ArticleViewSet(viewsets.ModelViewSet):
    queryset = Article.objects.all()
    serializer_class = ArticleSerializer

    @method_decorator(cache_page(60 * 30))
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)

    @method_decorator(cache_page(60 * 60))
    def retrieve(self, request, *args, **kwargs):
        return super().retrieve(request, *args, **kwargs)

    @method_decorator(never_cache)
    def create(self, request, *args, **kwargs):
        return super().create(request, *args, **kwargs)
```

## Manual Redis Caching with Varying Keys

For finer control, cache manually with custom keys:

```python
from django.core.cache import cache
from django.db.models import Sum
from rest_framework.decorators import api_view
from rest_framework.response import Response

@api_view(["GET"])
def user_stats(request, user_id):
    cache_key = f"user_stats:{user_id}"
    cached = cache.get(cache_key)
    if cached is not None:
        return Response({"source": "cache", "data": cached})

    stats = {
        "total_orders": Order.objects.filter(user_id=user_id).count(),
        "total_spent": Order.objects.filter(user_id=user_id)
                           .aggregate(Sum("amount"))["amount__sum"] or 0,
    }
    cache.set(cache_key, stats, timeout=300)
    return Response({"source": "db", "data": stats})
```

## Cache Invalidation on Write

```python
@api_view(["POST"])
def create_order(request):
    serializer = OrderSerializer(data=request.data)
    if serializer.is_valid():
        order = serializer.save()
        # Invalidate cached stats for this user
        cache.delete(f"user_stats:{order.user_id}")
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
```

## Caching with Pagination

Cache paginated results by including query params in the key:

```python
@api_view(["GET"])
def paginated_products(request):
    page = request.query_params.get("page", 1)
    page_size = request.query_params.get("page_size", 20)
    cache_key = f"products:page:{page}:size:{page_size}"

    cached = cache.get(cache_key)
    if cached:
        return Response(cached)

    products = Product.objects.all()[(int(page)-1)*int(page_size):int(page)*int(page_size)]
    data = ProductSerializer(products, many=True).data
    cache.set(cache_key, data, timeout=120)
    return Response(data)
```

## Summary

DRF responses are cached with `@cache_page` for whole-view caching or manual `cache.get`/`cache.set` for key-level control. Use `@never_cache` on write endpoints, include query parameters in manual cache keys for paginated views, and call `cache.delete()` on mutation endpoints to keep data consistent.
