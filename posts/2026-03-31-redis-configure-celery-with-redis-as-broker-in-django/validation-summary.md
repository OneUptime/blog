# Validation Summary: How to Configure Celery with Redis as Broker in Django

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Celery (distributed task queue)
- Redis (message broker and result backend)
- Django (web framework)
- Python

## Sources Consulted
- Celery official documentation — First Steps with Django: https://docs.celeryq.dev/en/stable/django/first-steps-with-django.html
- Celery configuration reference: https://docs.celeryq.dev/en/stable/userguide/configuration.html
- Celery CLI reference: https://docs.celeryq.dev/en/stable/reference/cli.html
- django-celery-results documentation: https://django-celery-results.readthedocs.io/

## Issues Found
1. **Unnecessary `django-celery-results` in installation command**: The post included `django-celery-results` in `pip install celery redis django-celery-results`, but the result backend is configured as `redis://127.0.0.1:6379/0` (direct Redis), not `django-db` which is what `django-celery-results` provides. The package is never used in the tutorial. Removed it from the install command to avoid confusing readers into installing an unused dependency.

## Review Notes
- The post correctly uses the `CELERY_` namespace prefix for all Django settings, which is required when using `app.config_from_object("django.conf:settings", namespace="CELERY")`.
- The lazy import of the User model inside the task function (`from .models import User`) is a valid pattern to avoid circular imports and ensure Django apps are fully loaded.
- If readers want to store task results in the Django database instead of Redis, they would need to install `django-celery-results`, add `'django_celery_results'` to `INSTALLED_APPS`, run migrations, and set `CELERY_RESULT_BACKEND = "django-db"`. This is an alternative approach not covered in this post, which is fine since the post focuses on Redis.
