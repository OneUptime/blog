# Validation Summary: How to Cache Django REST Framework Responses with Redis

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis
- Django
- Django REST Framework (DRF)
- django-redis (Python package)
- Python

## Sources Consulted
- Django cache framework documentation: https://docs.djangoproject.com/en/5.0/topics/cache/
- Django `cache_page` decorator documentation: https://docs.djangoproject.com/en/5.0/topics/cache/#the-per-view-cache
- Django `method_decorator` documentation: https://docs.djangoproject.com/en/5.0/topics/class-based-views/intro/#decorating-the-class
- Django REST Framework views documentation: https://www.django-rest-framework.org/api-guide/views/
- Django REST Framework ViewSets documentation: https://www.django-rest-framework.org/api-guide/viewsets/
- django-redis documentation: https://github.com/jazzband/django-redis
- Django `django.db.models.Sum` aggregation documentation: https://docs.djangoproject.com/en/5.0/ref/models/querysets/#sum

## Issues Found
1. **Missing `Sum` import in manual caching section**: The `user_stats` function used `aggregate(Sum("amount"))` but did not import `Sum` from `django.db.models`. This would cause a `NameError` at runtime. Added `from django.db.models import Sum` to the import block.

## Review Notes
- The `@never_cache` decorator on the `create` method in the ViewSet example is technically unnecessary since Django's `cache_page` only caches GET and HEAD requests by default. However, it serves as a defensive best practice and is not incorrect.
- The `cache_page` decorator with DRF caches the fully rendered response including content negotiation headers. For typical JSON-only APIs this works fine, but if an API serves multiple formats (JSON, HTML browsable API), different clients could receive the wrong cached content type. This is a known caveat worth noting but not an error in the code as presented.
- The pagination example uses basic offset slicing rather than DRF's built-in pagination classes. This is a valid approach for demonstrating cache key construction, though production code would typically use DRF's `PageNumberPagination` or `LimitOffsetPagination`.
