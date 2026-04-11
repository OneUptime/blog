# Validation Summary: How to Configure Multiple Redis Caches in Django

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis
- Django
- django-redis (Python package)
- Django cache framework
- Redis Sentinel

## Sources Consulted
- Django cache framework documentation: https://docs.djangoproject.com/en/5.0/topics/cache/
- django-redis documentation: https://github.com/jazzband/django-redis
- Django `cache_page` decorator documentation: https://docs.djangoproject.com/en/5.0/topics/cache/#the-per-view-cache
- Django session configuration documentation: https://docs.djangoproject.com/en/5.0/topics/http/sessions/#using-cached-sessions

## Issues Found

1. **`MAX_ENTRIES` in OPTIONS is not a valid django-redis option** — `MAX_ENTRIES` is a Django built-in cache option used by `LocMemCache`, `DatabaseCache`, and `FileBasedCache`. It has no effect when used with `django-redis` because Redis manages its own memory via `maxmemory` and eviction policies. Removed `MAX_ENTRIES` from all three cache backend configurations where it appeared (default, sessions, api) to avoid misleading readers into thinking Redis entry counts are being limited by Django.

2. **`DEFAULT_TIMEOUT` inside OPTIONS for "api" cache does nothing** — The "api" cache had `"DEFAULT_TIMEOUT": 60` inside the `OPTIONS` dict. This is not a recognized django-redis option and would be silently ignored. The correct way to set a default timeout is with the top-level `TIMEOUT` key. Changed to `"TIMEOUT": 60` at the cache config level so the 60-second timeout actually takes effect.

3. **Incorrect comment about `cache_page` behavior** — The comment stated "This respects CACHE_MIDDLEWARE_ALIAS, not per-cache", implying the `cache` parameter doesn't work. This is wrong: `cache_page(300, cache="api")` does use the "api" cache backend. `CACHE_MIDDLEWARE_ALIAS` is only the default when no `cache` argument is provided. Removed the misleading comment.

4. **Unused `method_decorator` import** — `from django.utils.decorators import method_decorator` was imported but never used in the example (the decorator is applied to a function-based view, not a class-based view method). Removed the unused import.

## Review Notes
- The `incr("hits:user:42")` example in the rate limiting section will raise `ValueError` if the key does not already exist in the cache. A production rate limiter would need to handle key initialization (e.g., `set` with a timeout on first access, then `incr` on subsequent calls). This is not a bug in the blog post per se since it's demonstrating the API, but readers implementing rate limiting should be aware.
- The Sentinel configuration includes a `SENTINEL_SERVICE_NAME` option. In django-redis, the service name is typically extracted from the LOCATION URL (`redis://mymaster/0`), so this option may be redundant. It does not cause errors but could confuse readers about which value takes precedence.
