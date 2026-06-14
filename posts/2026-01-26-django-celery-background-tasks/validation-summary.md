# Validation Summary: How to Build Background Tasks with Django Celery

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Django
- Celery
- Redis
- django-celery-results
- django-celery-beat
- Flower
- systemd
- Docker Compose
- Python

## Sources Consulted
- Celery: First steps with Django - https://docs.celeryq.dev/en/stable/django/first-steps-with-django.html
- Celery: Tasks user guide - https://docs.celeryq.dev/en/stable/userguide/tasks.html
- Celery: Calling tasks and errbacks - https://docs.celeryq.dev/en/latest/userguide/calling.html
- Celery: Periodic tasks and django-celery-beat scheduler - https://docs.celeryq.dev/en/main/userguide/periodic-tasks.html
- Celery: Workers guide - https://docs.celeryq.dev/en/stable/userguide/workers.html
- Celery: Daemonization with systemd - https://docs.celeryq.dev/en/stable/userguide/daemonizing.html
- django-celery-results documentation - https://django-celery-results.readthedocs.io/en/latest/
- django-celery-results admin source - https://github.com/celery/django-celery-results/blob/main/django_celery_results/admin.py
- django-celery-beat documentation - https://django-celery-beat.readthedocs.io/
- Django shortcuts documentation - https://docs.djangoproject.com/en/6.0/topics/http/shortcuts/
- Django request and response documentation - https://docs.djangoproject.com/en/6.0/ref/request-response/
- Django sessions documentation - https://docs.djangoproject.com/en/6.0/topics/http/sessions/
- Flower documentation - https://flower.readthedocs.io/
- Docker Compose file reference: version top-level element - https://docs.docker.com/reference/compose-file/version-and-name/

## Issues Found
- The architecture diagram showed task results being stored in Redis while the tutorial configures `CELERY_RESULT_BACKEND = 'django-db'`. Updated the diagram to show a Django database result backend.
- The integration bullet said there are management commands for running workers. Modern Celery uses the `celery` CLI, so this was changed to "Celery CLI commands."
- The settings snippet included `CELERY_CACHE_BACKEND = 'django-cache'` while using the Django database result backend. Removed the cache backend setting because Celery documents it for `CELERY_RESULT_BACKEND = 'django-cache'`.
- The registration view used `render()` without importing it. Added `render` to the Django shortcuts import.
- The error callback example used `JsonResponse`, `send_notification`, and an uploaded `file` variable without showing valid imports or assignment. Added the relevant imports and changed the upload handling to `request.FILES['file']`.
- The session cleanup example imported `Session` from the app models and queried a non-standard `last_activity` field. Updated it to use Django's database session model and the documented `expire_date` field.
- The systemd service wrote its PID file under `/var/run` without a matching `PIDFile` declaration. Updated the example to use `/run/celery/worker.pid` consistently and added `PIDFile`.
- The Docker Compose example used the obsolete top-level `version` key. Removed it because current Docker Compose treats it as informational and emits an obsolete warning.

## Review Notes
- Celery's Django docs recommend considering transaction-aware task dispatch, such as `delay_on_commit()`, when queueing tasks that depend on database changes inside transactions. The existing `.delay()` example is still valid for the shown flow.
- Celery Beat should run as a single scheduler instance for a given schedule to avoid duplicate periodic task dispatch.
