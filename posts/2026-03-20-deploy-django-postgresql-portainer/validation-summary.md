# Validation Summary: How to Deploy a Django + PostgreSQL Stack via Portainer

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Portainer (container management UI)
- Docker Compose
- Django (Python web framework)
- PostgreSQL 16 (Alpine image)
- Python 3.12
- Gunicorn (WSGI server)
- dj-database-url (Django database URL parser)
- django-health-check (Django health probe library)

## Sources Consulted
- Docker Hub – `postgres` image: https://hub.docker.com/_/postgres
- Docker Hub – `python` image: https://hub.docker.com/_/python
- PostgreSQL `pg_isready` docs: https://www.postgresql.org/docs/current/app-pg-isready.html
- Docker Compose `depends_on` / `service_healthy` reference: https://docs.docker.com/compose/compose-file/05-services/#depends_on
- Django settings reference (SECRET_KEY, DEBUG, ALLOWED_HOSTS, DATABASES, STATIC_ROOT): https://docs.djangoproject.com/en/5.0/ref/settings/
- Django `collectstatic` / `migrate` / `createsuperuser` management commands: https://docs.djangoproject.com/en/5.0/ref/django-admin/
- Gunicorn deployment docs: https://docs.gunicorn.org/en/stable/run.html
- `dj-database-url` on PyPI: https://pypi.org/project/dj-database-url/
- `django-health-check` on PyPI: https://pypi.org/project/django-health-check/

## Issues Found
No technical issues found.

## Review Notes
- The Compose file declares `version: "3.8"`. The top-level `version` field is considered obsolete by Compose Specification / Docker Compose v2 and emits a warning, but it is still accepted and functional, so no change was made.
- Setting `DJANGO_ALLOWED_HOSTS: "*"` works (Django treats `*` as a wildcard) but is permissive for production; the post already flags `djangopass` as a value to change, and a similar caveat for `ALLOWED_HOSTS` could be added in a future revision.
- The `web` service uses the base `python:3.12-slim` image and installs dependencies at container start via `pip install -r requirements.txt`. This implicitly requires `gunicorn`, `django`, `dj-database-url`, and (optionally) `django-health-check` to be listed in `requirements.txt`. Building a custom image with a `Dockerfile` would be a more production-ready pattern but is out of scope for this introductory walkthrough.
- `dj_database_url.parse(...)` is correct; newer versions of the library also expose `dj_database_url.config(...)` which reads `DATABASE_URL` directly from the environment — both are valid.
