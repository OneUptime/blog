# Validation Summary: How to Build Production Django Applications

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Django (5.x)
- Python 3.12
- PostgreSQL
- Django REST Framework
- WhiteNoise (static file serving)
- django-cors-headers
- django-csp (Content Security Policy)
- python-json-logger
- Gunicorn
- Docker

## Sources Consulted
- Django 5.x settings reference: https://docs.djangoproject.com/en/5.2/ref/settings/
- Django security topic guide: https://docs.djangoproject.com/en/5.2/topics/security/
- Django databases reference: https://docs.djangoproject.com/en/5.2/ref/databases/
- Django django-admin / manage.py reference: https://docs.djangoproject.com/en/5.2/ref/django-admin/
- Django staticfiles `STORAGES` ticket #34773: https://code.djangoproject.com/ticket/34773
- WhiteNoise Django integration: https://whitenoise.readthedocs.io/en/stable/django.html
- django-cors-headers PyPI / repo: https://pypi.org/project/django-cors-headers/
- django-csp 4.0 migration guide: https://django-csp.readthedocs.io/en/latest/migration-guide.html
- python-json-logger Quick Start: https://nhairs.github.io/python-json-logger/latest/quickstart/

## Issues Found

1. **Deprecated `STATICFILES_STORAGE` setting (two occurrences).**
   - What was wrong: The post used `STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'`. This setting was deprecated in Django 4.2 (April 2023) in favor of the unified `STORAGES` dict; the two are mutually exclusive and the legacy form is on the removal path.
   - What I changed: Replaced both occurrences (in `base.py`'s database section and in the dedicated Static Files Configuration section) with the modern `STORAGES = {'default': {...}, 'staticfiles': {...}}` dict form recommended by WhiteNoise's current docs.
   - Why: Tutorials labelled "production" in 2026 should teach the current canonical API.

2. **Broken django-csp settings (the `CSP_*` family).**
   - What was wrong: The post used `CSP_DEFAULT_SRC`, `CSP_SCRIPT_SRC`, `CSP_STYLE_SRC` tuples. django-csp 4.0 (released November 2025) removed the individual `CSP_*` settings entirely; on 4.0+ those settings have no effect.
   - What I changed: Replaced with the new `CONTENT_SECURITY_POLICY` dict using a `DIRECTIVES` sub-dict and the `SELF` sentinel imported from `csp.constants`, matching the django-csp 4.0 migration guide.
   - Why: As-written, the snippet would silently fail on the current django-csp release.

3. **Outdated python-json-logger import path.**
   - What was wrong: `'pythonjsonlogger.jsonlogger.JsonFormatter'` is the pre-3.0 module path. python-json-logger 3.0 (mid-2024) moved `JsonFormatter` to `pythonjsonlogger.json`. The old path still works as a deprecation shim but is documented as deprecated.
   - What I changed: Updated to `'pythonjsonlogger.json.JsonFormatter'`.
   - Why: Match the current upstream import path.

## Review Notes

- Middleware ordering is correct: WhiteNoise is placed directly after `SecurityMiddleware` (per WhiteNoise docs) and `CorsMiddleware` is placed before `CommonMiddleware` (per django-cors-headers docs).
- All listed security settings (`SECURE_SSL_REDIRECT`, `SECURE_PROXY_SSL_HEADER`, `SESSION_COOKIE_SECURE`, `CSRF_COOKIE_SECURE`, `SESSION_COOKIE_HTTPONLY`, `SECURE_HSTS_SECONDS`, `SECURE_HSTS_INCLUDE_SUBDOMAINS`, `SECURE_HSTS_PRELOAD`, `X_FRAME_OPTIONS`, `SECURE_CONTENT_TYPE_NOSNIFF`) are valid Django 5.x settings and the values shown are reasonable production defaults.
- Database config is correct: `CONN_MAX_AGE` belongs at the per-alias top level (not inside `OPTIONS`), and `connect_timeout` belongs inside `OPTIONS` as a libpq/psycopg parameter. Caveat for the future: if a reader adopts Django 5.1+ native connection pooling (`OPTIONS={'pool': {...}}`), `CONN_MAX_AGE` should be set to 0 — the post does not mention this.
- ORM optimization (`select_related`/`prefetch_related` with `Prefetch`) and the indexing example (`db_index=True`, `class Meta: indexes = [...]`) are syntactically and semantically correct.
- The `urls.py` snippet under "Health Check Endpoint" omits `from django.urls import path`; it is clearly a partial snippet (`# ... other urls`) and left unchanged.
- The Dockerfile runs `collectstatic` at build time. In practice this requires `DJANGO_SETTINGS_MODULE` and `DJANGO_SECRET_KEY` to be set at build, which the snippet does not show — a common gotcha but acceptable for a minimal example.
- All four `manage.py` commands (`check --deploy`, `migrate --noinput`, `collectstatic --noinput`, `diffsettings`) are current and correct.
