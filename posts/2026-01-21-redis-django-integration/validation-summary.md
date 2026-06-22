# Validation Summary: How to Use Redis with Django

## Status
validated

## Post Type
Tutorial / integration guide

## Technologies Covered
- Redis
- Django
- django-redis
- Python
- Django cache framework
- Django sessions
- Celery
- Django Channels
- channels-redis
- redis-py

## Sources Consulted
- Django cache framework documentation: https://docs.djangoproject.com/en/6.0/topics/cache/
- Django sessions documentation: https://docs.djangoproject.com/en/6.0/topics/http/sessions/
- django-redis documentation / README: https://github.com/jazzband/django-redis
- Celery Redis broker/backend documentation: https://docs.celeryq.dev/en/stable/getting-started/backends-and-brokers/redis.html
- Celery calling tasks documentation: https://docs.celeryq.dev/en/stable/userguide/calling.html
- Django Channels installation documentation: https://channels.readthedocs.io/en/stable/installation.html
- Django Channels channel layers documentation: https://channels.readthedocs.io/en/stable/topics/channel_layers.html
- Django Channels routing documentation: https://channels.readthedocs.io/en/latest/topics/routing.html
- Django Channels authentication documentation: https://channels.readthedocs.io/en/latest/topics/authentication.html
- Redis command documentation: https://redis.io/docs/latest/commands/scan/
- redis-py command documentation: https://redis.readthedocs.io/en/stable/commands.html

## Issues Found
- The initial installation command installed `celery` and `redis` separately. Updated it to `python -m pip install django-redis "celery[redis]"`, matching Celery's documented Redis extra.
- The django-redis cache configuration used `CONNECTION_POOL_CLASS_KWARGS`, `MAX_CONNECTIONS`, and uppercase timeout options in a way that does not match the current documented django-redis pool configuration. Updated it to use `CONNECTION_POOL_KWARGS` with redis-py connection options.
- The "Redis Cluster Configuration" section showed django-redis primary/replica configuration, not Redis Cluster. Renamed the section to "Redis Primary/Replica Configuration".
- The sessions section included an obsolete direct `django_redis.session.SessionStore` / `SESSION_REDIS` configuration. Removed it and kept Django's documented cache session backend configuration.
- The Celery session cleanup task implied it applied to Redis cache sessions, but `django.contrib.sessions.models.Session` only applies to database-backed session storage. Renamed it and added a short comment clarifying that it is for database-backed or `cached_db` sessions.
- The ETA example used `datetime.utcnow()`, which produces a naive datetime and is discouraged in modern Django code. Updated it to use `django.utils.timezone.now()`.
- The Channels installation/configuration snippet omitted the current documented Daphne setup path. Updated the command to install `channels[daphne]` and added `daphne` to `INSTALLED_APPS`.
- The Channels ASGI snippet imported application routing before initializing Django's ASGI application. Reordered it to initialize `django_asgi_app` before importing `myapp.routing`, matching Channels' documented pattern.

## Review Notes
The remaining code examples are technically valid as illustrative snippets, but several assume surrounding project code exists, such as imports for `render`, `redirect`, `timezone`, and application-specific models like `Order`. For a future full runnable sample, those supporting imports and model definitions should be included.
