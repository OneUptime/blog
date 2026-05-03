# Validation Summary: How to Deploy a Flask + Redis + Celery Stack via Portainer

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Portainer (container management UI)
- Docker Compose (v3.8 schema)
- Redis 7 (broker / result backend)
- Flask (Python web framework)
- Celery 5 (distributed task queue)
- Celery Beat (periodic task scheduler)
- Gunicorn (WSGI HTTP server)
- Python 3.12

## Sources Consulted
- Celery "First Steps" / Application docs: https://docs.celeryq.dev/en/stable/getting-started/first-steps-with-celery.html
- Celery `--app` (`-A`) option: https://docs.celeryq.dev/en/stable/reference/cli.html
- Celery Beat docs: https://docs.celeryq.dev/en/stable/userguide/periodic-tasks.html
- Flask 2.3 changelog (FLASK_ENV removal): https://flask.palletsprojects.com/en/stable/changes/
- Redis persistence (AOF) docs: https://redis.io/docs/management/persistence/
- Gunicorn settings reference: https://docs.gunicorn.org/en/stable/settings.html
- Docker Compose specification: https://docs.docker.com/compose/compose-file/

## Issues Found
1. **Celery `-A` target referenced a non-existent module.** Both `celery-worker` and `celery-beat` services ran `celery -A tasks ...`, but the example application defines the Celery instance in `app/app.py` as `celery = Celery(...)`. There is no `tasks.py` in the shown structure, so both containers would crash with `ModuleNotFoundError: No module named 'tasks'`. Updated the commands to `celery -A app.celery worker` and `celery -A app.celery beat` to explicitly reference the `celery` instance defined in `app.py` (Python imports relative to the working directory `/app`).
2. **`FLASK_ENV: production` is deprecated.** This variable was deprecated in Flask 2.2 and removed in Flask 2.3. Since `python:3.12-slim` plus `pip install` will pull current Flask (3.x), the variable has no effect. Removed it from the `flask` service `environment` block; it is also moot in production where Gunicorn serves the app, not Flask's dev server.

## Review Notes
- `version: "3.8"` is obsolete with Docker Compose v2 (it logs a warning and is ignored), but it remains widely used and does not break anything. Left as-is to preserve the author's style.
- `FLASK_SECRET_KEY` is set in the environment but the example `app.py` never reads it into `app.config['SECRET_KEY']`. This is a minor incompleteness in the snippet rather than an error — the post is showing scaffolding, and a real deployment would wire it up. Not changed.
- The Flask + Celery integration shown is the simple/minimalist pattern. For tasks that need Flask app/request context, the canonical pattern is to wrap `celery.Task` so `__call__` enters `app.app_context()`. The post's example task does not need this, so the current code is fine.
- Relative bind mounts (`./app:/app`) require the path to exist on the Docker host where Portainer runs the stack. This is a Portainer/Compose deployment caveat worth noting, but not technically incorrect.
- `redis-server --appendonly yes` enables AOF persistence and is the correct flag for Redis 7.
- `gunicorn -w 4 -b 0.0.0.0:5000 app:app` correctly references the Flask `app` object in `app.py`, and the `working_dir: /app` ensures the import path resolves.
