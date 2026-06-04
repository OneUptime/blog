# Validation Summary: How to Set Up a Django + PostgreSQL + Redis Stack with Docker Compose

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Docker
- Docker Compose
- Django
- PostgreSQL
- Redis
- Celery
- Gunicorn
- WhiteNoise
- Nginx
- Python

## Sources Consulted
- Docker Compose file reference: https://docs.docker.com/reference/compose-file/
- Docker Compose version and name top-level elements: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Compose CLI reference: https://docs.docker.com/reference/cli/docker/compose/
- Django downloads and supported versions: https://www.djangoproject.com/download/
- Django security release for 6.0.6 and 5.2.15: https://www.djangoproject.com/weblog/2026/jun/03/security-releases/
- Django 5.1 release notes for removed `STATICFILES_STORAGE`: https://docs.djangoproject.com/en/stable/releases/5.1/
- Django staticfiles documentation: https://docs.djangoproject.com/en/5.2/ref/contrib/staticfiles/
- Django sessions documentation: https://docs.djangoproject.com/en/5.2/topics/http/sessions/
- Django cache framework documentation: https://docs.djangoproject.com/en/5.2/topics/cache/
- Celery first steps with Django: https://docs.celeryq.dev/en/latest/django/first-steps-with-django.html
- django-environ documentation: https://django-environ.readthedocs.io/
- WhiteNoise Django documentation: https://whitenoise.readthedocs.io/en/stable/django.html
- PostgreSQL Docker image documentation: https://hub.docker.com/_/postgres
- Redis Docker image documentation: https://hub.docker.com/_/redis
- Nginx reverse proxy documentation: https://docs.nginx.com/nginx/admin-guide/web-server/reverse-proxy/

## Issues Found
- The requirements snippet pinned `django==5.0.2`, but Django 5.0 is unsupported in 2026 and no longer receives security updates. Updated the example to `django==5.2.15`, the supported Django 5.2 LTS security release available on the validation date.
- The Compose file used the obsolete top-level `version: "3.8"` field. Removed it so the example follows the current Compose Specification.
- The Dockerfile suppressed `collectstatic` failures with `2>/dev/null || true`, and the settings snippet requires `SECRET_KEY`, so static collection could silently fail during image builds. Changed the command to provide a build-time secret value and fail normally if static collection is broken.
- The Django settings snippet used `STATICFILES_STORAGE`, which was removed in Django 5.1. Replaced it with the supported `STORAGES["staticfiles"]` configuration for WhiteNoise.
- The settings used cache-only sessions while the scheduled cleanup task deletes expired database sessions. Changed the session backend to `cached_db`, which caches sessions in Redis while preserving database-backed session rows for cleanup.
- The Nginx snippet served `/static/` from `/app/staticfiles/`, but the post does not show a shared volume or copied static files in the Nginx container. Removed that location block so Nginx acts as a reverse proxy to the Django/WhiteNoise app shown in the tutorial.

## Review Notes
- The embedded Python code blocks parse successfully after the fixes.
- The embedded Docker Compose YAML parses successfully after the fixes.
- The tutorial remains a compact stack example. A future production-focused revision could add a full `docker-compose.prod.yml`, non-root container user, secret management, TLS, and explicit static/media volume strategy.
