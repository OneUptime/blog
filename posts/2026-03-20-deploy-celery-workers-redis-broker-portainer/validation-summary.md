# Validation Summary: How to Deploy Celery Workers with Redis Broker via Portainer - Deploy Workers

## Status
validated

## Post Type
Tutorial / Deployment Guide

## Technologies Covered
- Celery (Python distributed task queue, v5.x CLI syntax)
- Redis 7 (message broker and result backend)
- Python (task definitions and config)
- Flower 2.0 (Celery monitoring dashboard)
- django-celery-beat (DatabaseScheduler for Beat)
- Docker Compose (Compose file v3.8)
- Portainer (stack deployment and scaling)

## Sources Consulted
- Celery 5.x CLI documentation: https://docs.celeryq.dev/en/stable/reference/cli.html
- Celery configuration reference: https://docs.celeryq.dev/en/stable/userguide/configuration.html
- Celery task retry docs: https://docs.celeryq.dev/en/stable/userguide/tasks.html#retrying
- django-celery-beat docs: https://django-celery-beat.readthedocs.io/
- Flower documentation: https://flower.readthedocs.io/en/latest/
- mher/flower Docker Hub: https://hub.docker.com/r/mher/flower
- Redis Docker image: https://hub.docker.com/_/redis
- Docker Compose `depends_on` with `condition`: https://docs.docker.com/compose/compose-file/05-services/#depends_on
- Docker Compose `healthcheck`: https://docs.docker.com/compose/compose-file/05-services/#healthcheck

## Issues Found

1. **Missing Redis healthcheck while using `condition: service_healthy`** — The `webapp`, `celery-worker`, and `celery-beat` services all declared `depends_on: redis: condition: service_healthy`, but the `redis` service had no `healthcheck` defined. Without a healthcheck, the dependency would never resolve and the dependent containers would not start. Added a `redis-cli ping` healthcheck (interval 10s, timeout 5s, retries 5) to the Redis service.

2. **Missing `import os` in `celeryconfig.py`** — The config snippet called `os.environ.get(...)` without importing `os`, which would raise `NameError` at import time. Added `import os` at the top of the snippet.

## Review Notes
- The Compose file declares `version: "3.8"`, which is now obsolete in modern Docker Compose v2 (a warning is emitted, but the file still works). Left as-is since it's harmless and matches the rest of the blog series.
- `deploy.replicas` in the Step 4 snippet is honored by `docker compose up` in Compose v2.13+ for non-Swarm deployments and by Swarm mode; this is consistent with how Portainer typically deploys stacks.
- The `celery flower --broker=...` command works because Flower's own CLI accepts `--broker`. The Celery 5 idiomatic form is `celery --broker=... flower`, but the form used here is also valid.
- The Beat service uses `django_celery_beat.schedulers:DatabaseScheduler`, which requires the `django-celery-beat` package and a configured Django app — fine as a Django-oriented example, just worth noting it isn't usable outside Django.
- The `flower` service uses simple `depends_on: - redis` (without health condition) while the other services use the long form with `service_healthy`. Functionally fine and intentional (Flower can tolerate Redis being briefly unavailable on startup).
