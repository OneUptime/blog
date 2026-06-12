# Validation Summary: How to Use Django Caching with Redis

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Django cache framework
- django-redis
- Python
- Redis
- Django sessions
- Django middleware

## Sources Consulted
- Django cache framework documentation: https://docs.djangoproject.com/en/6.0/topics/cache/
- Django settings documentation for CACHES and cache middleware settings: https://docs.djangoproject.com/en/6.0/ref/settings/
- Django sessions documentation: https://docs.djangoproject.com/en/6.0/topics/http/sessions/
- django-redis official README: https://github.com/jazzband/django-redis
- Redis KEYS command documentation: https://redis.io/docs/latest/commands/keys/
- Redis SCAN command documentation: https://redis.io/docs/latest/commands/scan/
- Redis INFO command documentation: https://redis.io/docs/latest/commands/info/

## Issues Found
- The django-redis compressor comment said values larger than 10KB are compressed. The official django-redis documentation describes enabling a compressor backend and does not document a 10KB threshold there, so the comment was changed to "Enable compression for cached values."
- The pattern-based cache example used the raw Redis `KEYS` command for discovery and deletion. Redis documents `KEYS` as a command for debugging/special operations and warns against regular production use on large databases. The example was changed to django-redis `cache.iter_keys()` and `cache.delete_pattern()` helpers.
- The per-site cache section said it caches all responses site-wide for anonymous users. Django's cache middleware caches GET and HEAD responses with status 200 when headers allow it; it is not inherently limited to anonymous users. The wording was corrected.
- The session section described `django.contrib.sessions.backends.cached_db` as using the django-redis session backend directly. Django documents `cached_db` as Django's write-through cached database session backend, so the comment was corrected.

## Review Notes
The examples are otherwise consistent with Django's documented cache API, cache middleware ordering, template fragment caching syntax, session cache alias usage, and django-redis configuration. The custom cache monitoring middleware initializes counters but does not instrument cache calls itself; it is a starting point rather than a complete hit/miss tracker.
