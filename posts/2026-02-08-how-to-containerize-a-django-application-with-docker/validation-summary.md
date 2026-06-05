# Validation Summary: How to Containerize a Django Application with Docker

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Django
- Python
- Docker
- Docker Compose
- PostgreSQL
- Psycopg
- Gunicorn
- Nginx

## Sources Consulted
- Django 5.2 `django-admin` and `manage.py` documentation: https://docs.djangoproject.com/en/5.2/ref/django-admin/
- Django 5.2 static files deployment documentation: https://docs.djangoproject.com/en/5.2/howto/static-files/deployment/
- Django 5.2 settings documentation: https://docs.djangoproject.com/en/5.2/ref/settings/
- Django 5.2 database documentation: https://docs.djangoproject.com/en/5.2/ref/databases/
- Psycopg 3 installation documentation: https://www.psycopg.org/psycopg3/docs/basic/install.html
- Docker Compose file reference: https://docs.docker.com/reference/compose-file/
- Docker Compose services reference: https://docs.docker.com/reference/compose-file/services/
- Dockerfile reference: https://docs.docker.com/reference/dockerfile/
- Gunicorn settings documentation: https://docs.gunicorn.org/en/stable/settings.html
- PostgreSQL `pg_isready` documentation: https://www.postgresql.org/docs/16/app-pg-isready.html
- PostgreSQL Docker Official Image documentation: https://hub.docker.com/_/postgres

## Issues Found
- The post used `psycopg2-binary` for a Django 5 production-oriented PostgreSQL setup. Django 5.2 recommends Psycopg 3.1.8+ and notes that `psycopg2` support is likely to be deprecated eventually, so the install command and `requirements.txt` were updated to use `psycopg[binary]>=3.1`.
- The production Dockerfile installed `gcc` and `libpq-dev` only for the old Psycopg 2 source-build workflow. Since the corrected example uses Psycopg 3 binary packages, those build dependencies were removed from the production Dockerfile.
- The post said Django's development server handles one request at a time. Django's documentation says the development server is multithreaded by default, so this was changed to the documented reason it is unsuitable for production: it has not gone through security audits or performance tests.
- The Dockerfile ran `collectstatic`, but the settings example did not define `STATIC_ROOT`. Django's static files deployment documentation requires collected static files to go into `STATIC_ROOT`, so `STATIC_URL`, `STATIC_ROOT`, `MEDIA_URL`, and `MEDIA_ROOT` were added to the settings snippet.
- The Compose snippets used the obsolete top-level `version` key. Docker's current Compose Specification treats it as only informative and warns that it is obsolete, so the `version: "3.8"` lines were removed.
- The entrypoint snippet described `python manage.py check --database default` as waiting for the database. Django documents this option as running checks that require database access, not as a retrying wait loop, so the wording was changed to "Verify the database is available."
- The entrypoint Dockerfile addition did not specify placement relative to `USER appuser`. The text now says to add the entrypoint before the ownership and `USER` lines so `chmod` runs with the expected permissions.
- The prerequisites mentioned Docker Engine only, but the tutorial uses `docker compose`. The prerequisite was updated to require Docker Engine with Docker Compose v2.

## Review Notes
- The examples remain simplified and still use inline secrets for demonstration. In a real production deployment, secrets should be injected through a secret manager or protected environment mechanism.
- The `DEBUG` parsing example is technically workable for the shown `True` and `False` values, but a future improvement could make boolean environment parsing case-insensitive.
