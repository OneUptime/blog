# Validation Summary: How to Install Taiga for Agile Project Management on Ubuntu

## Status
validated

## Post Type
Tutorial / Installation Guide

## Technologies Covered
- Taiga (open-source agile project management platform)
- Docker / Docker Compose
- PostgreSQL (taiga-db)
- RabbitMQ (async tasks + realtime events)
- Django (taiga-back backend)
- nginx (taiga-gateway and host-level reverse proxy)
- Let's Encrypt / certbot (SSL)
- Ubuntu 20.04 / 22.04

## Sources Consulted
- Taiga Docker repository: https://github.com/taigaio/taiga-docker
- Live `docker-compose.yml`: https://raw.githubusercontent.com/taigaio/taiga-docker/main/docker-compose.yml
- Live `.env` defaults: https://raw.githubusercontent.com/taigaio/taiga-docker/main/.env
- Docker Compose V2 plugin documentation (docker compose CLI behaviour)
- Django `createsuperuser` `--noinput` behaviour (creates user with unusable password unless `DJANGO_SUPERUSER_PASSWORD` is set)

## Issues Found

1. **Wrong environment variable names in the `.env` example block.** The post listed several variables that do not exist in the upstream `.env`:
   - `TAIGA_SUBPATH` → corrected to `SUBPATH` (the upstream variable name; `docker-compose.yml` maps it onto `TAIGA_SUBPATH` internally).
   - `TAIGA_BACKEND_URL`, `TAIGA_FRONTEND_URL`, `TAIGA_EVENTS_URL` do not exist. Replaced with the real variables: `TAIGA_SCHEME`, `TAIGA_DOMAIN`, `WEBSOCKETS_SCHEME`.
   - `DEFAULT_FROM_EMAIL` → corrected to `EMAIL_DEFAULT_FROM` (which is what `docker-compose.yml` reads from the `.env`).
   - `EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend` → corrected to `EMAIL_BACKEND=smtp`. The compose file already wraps the value as `django.core.mail.backends.${EMAIL_BACKEND}.EmailBackend`, so passing the full path would have double-wrapped it and broken email.
   - Removed `PUBLIC_REGISTER_ENABLED`, `POSTGRES_DB`, `POSTGRES_HOST`, `RABBITMQ_HOST` — none of these are read from the upstream `.env` (the values are hardcoded in `docker-compose.yml`), so leaving them in would mislead readers into thinking they could change them.
   - Removed the entire MinIO/`AWS_*` section. The default `taiga-docker` setup does **not** include MinIO or S3-style object storage; attachments are stored on a local Docker volume (`taiga-media-data`). Adding these would have implied an S3 backend that the compose file does not configure.
   - Added the variables that *do* exist in the upstream `.env` but were missing from the post: `RABBITMQ_ERLANG_COOKIE`, `ATTACHMENTS_MAX_AGE`, `ENABLE_TELEMETRY`.

2. **Wrong `cp .env.example .env` step.** The taiga-docker repo ships a working `.env` directly (no `.env.example`). Replaced with simply `nano .env`.

3. **Missing service in the compose service list.** The post listed 8 services but the real `docker-compose.yml` defines 9 — `taiga-events-rabbitmq` (a second RabbitMQ instance used by the events server) was missing. Added it.

4. **Wrong HTTPS-switchover instruction.** The "switch to HTTPS and restart" step referenced `TAIGA_BACKEND_URL` / `TAIGA_FRONTEND_URL` (which don't exist). Corrected to "set `TAIGA_SCHEME=https` and `WEBSOCKETS_SCHEME=wss`".

5. **Wrong media path in the media-backup command.** The post used `/taiga/media`, but inside the `taiga-back` container the media volume is mounted at `/taiga-back/media` (per the `x-volumes` block in the compose file). The `/taiga/media` path only exists inside `taiga-gateway`. Updated to `/taiga-back/media` and added `-T` to keep `docker compose exec` non-interactive for piping.

6. **Minor wording fix.** The intro listed "cache" as one of the Taiga components; Taiga doesn't ship a cache service in the default Docker setup — corrected to "message broker" (RabbitMQ).

## Review Notes

- **nginx + certbot order.** The reverse-proxy section runs `certbot --nginx -d taiga.example.com` *before* symlinking the site into `sites-enabled` and reloading nginx. In practice, `certbot --nginx` needs the site enabled and nginx serving the domain to validate the cert, and the supplied config already references cert files that don't exist yet — so `nginx -t` would fail on first reload. A working order is to start with an HTTP-only server block, enable it, reload, then run `certbot --nginx` (which will rewrite the config to add HTTPS), or to use `certbot certonly --webroot` to fetch certs before placing the HTTPS config. Left the original flow to avoid restructuring the section beyond technical-correctness fixes, but readers may need to adjust ordering when following along.
- **`createsuperuser --noinput`.** This works because Django creates the user with an unusable password and the next shell command sets one; readers could also set `DJANGO_SUPERUSER_PASSWORD` as an env var to avoid the second step. The upstream Taiga repo prefers `./taiga-manage.sh createsuperuser` (which uses `docker compose run --rm taiga-manage` from `docker-compose-inits.yml`), but the `docker compose exec taiga-back …` approach in the post is equivalent in effect.
- **Pinned versions.** The compose file pins `postgres:12.3` and `rabbitmq:3.8-management-alpine`. These are old at the time of review; Taiga itself runs against them fine, but operators should not assume newer Postgres/RabbitMQ versions until upstream bumps the images.
- **`taiga-async` is not strictly "Celery".** The original wording "Celery worker for background tasks" was softened to just "worker for background tasks" because Taiga's async stack is RabbitMQ-driven; the user-facing detail isn't important here.
