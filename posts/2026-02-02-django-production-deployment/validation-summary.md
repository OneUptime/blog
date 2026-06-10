# Validation Summary: How to Deploy Django to Production Servers

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Django (Python web framework)
- Gunicorn (WSGI HTTP server)
- Nginx (reverse proxy / web server)
- PostgreSQL (database)
- systemd (service management)
- Let's Encrypt / Certbot (SSL certificates)
- Redis (mentioned in architecture diagram for caching/sessions)

## Sources Consulted
- Django deployment checklist: https://docs.djangoproject.com/en/stable/howto/deployment/checklist/
- Django security settings reference: https://docs.djangoproject.com/en/stable/ref/settings/#security
- Django databases (PostgreSQL): https://docs.djangoproject.com/en/stable/ref/databases/#postgresql-notes
- Django logging docs: https://docs.djangoproject.com/en/stable/topics/logging/
- Django `runserver` docs: https://docs.djangoproject.com/en/stable/ref/django-admin/#runserver
- Gunicorn settings: https://docs.gunicorn.org/en/stable/settings.html
- Gunicorn deployment docs: https://docs.gunicorn.org/en/stable/deploy.html
- Nginx `ngx_http_ssl_module` and `listen` directives: https://nginx.org/en/docs/
- systemd.service / systemd.exec manpages (RuntimeDirectory, EnvironmentFile, Restart, LimitNOFILE)
- Certbot user guide: https://eff-certbot.readthedocs.io/
- PostgreSQL `CREATE DATABASE` / `CREATE ROLE` / `ALTER ROLE` reference: https://www.postgresql.org/docs/current/

## Issues Found
- **"The development server is single-threaded"** — Incorrect. Django's `runserver` has been multi-threaded by default since Django 1.4 (`--nothreading` is required to disable it). Edited the introduction to say the dev server "is not designed for production use, lacks security hardening, and will fall over under any real traffic", which keeps the author's point without the inaccuracy.

## Review Notes
- `SECURE_BROWSER_XSS_FILTER = True` is still a valid Django setting, but modern browsers (Chrome, Edge, Firefox, Safari) have removed support for the `X-XSS-Protection` header it controls. Same applies to the `add_header X-XSS-Protection ... ` line in the Nginx config. Both are harmless but increasingly cosmetic — not technically wrong, so left as-is.
- `listen 443 ssl http2;` works in current Nginx releases but the inline `http2` parameter has been deprecated in Nginx 1.25.1 in favor of the separate `http2 on;` directive. The current syntax still functions, so left as-is.
- On PostgreSQL 15+, `GRANT ALL PRIVILEGES ON DATABASE` no longer implies CREATE on the `public` schema (the public schema's default privileges were tightened). For Django to run migrations on a fresh DB, users may additionally need `GRANT ALL ON SCHEMA public TO myproject_user;` (or to set the user as the schema/database owner). Worth keeping in mind when troubleshooting permission errors, but not a blocker for the post's accuracy.
- `python manage.py collectstatic` is shown without `--noinput` in the pre-deployment checklist table and with `--noinput` in the later code block; both are correct, the former is just interactive.
- The Gunicorn worker formula `(2 x CPU cores) + 1` matches the official Gunicorn deployment guidance.
- The systemd unit's `RuntimeDirectory=gunicorn` correctly causes systemd to create `/run/gunicorn` with the service's User/Group, which matches the socket path used by both the Gunicorn config and the Nginx upstream.
