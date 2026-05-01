# Validation Summary: How to Deploy Taiga (Project Management) via Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Taiga
- Docker Compose
- Nginx
- PostgreSQL
- RabbitMQ

## Sources Consulted
- Taiga Docker README: https://github.com/taigaio/taiga-docker/blob/main/README.md
- Taiga Docker Compose stack: https://github.com/taigaio/taiga-docker/blob/main/docker-compose.yml
- Taiga Docker init stack: https://github.com/taigaio/taiga-docker/blob/main/docker-compose-inits.yml
- Taiga gateway nginx config: https://github.com/taigaio/taiga-docker/blob/main/taiga-gateway/taiga.conf
- Taiga Docker environment reference: https://github.com/taigaio/taiga-docker/blob/main/.env
- Taiga Docker version reference: https://github.com/taigaio/taiga-docker/blob/main/VERSION.md
- Taiga production installation docs: https://docs.taiga.io/setup-production.html
- Docker Compose startup ordering: https://docs.docker.com/compose/how-tos/startup-order/
- Portainer relative path volumes: https://docs.portainer.io/advanced/relative-paths

## Issues Found
- The original stack omitted `taiga-events`, `taiga-protected`, and `taiga-async-rabbitmq`, and it did not pass RabbitMQ credentials into the Taiga application services. I added the missing services and environment variables to match Taiga's official deployment architecture so async tasks, protected attachments, and realtime events are wired correctly.
- The original stack mounted `./taiga.conf`, but the post did not provide that file and a simple Portainer stack does not inherently have that relative-path file available. I replaced the bind mount with an inline gateway command that writes Taiga's official nginx config into the container at startup.
- The original post pinned Taiga services to `6.8.1`, while Taiga's official `VERSION.md` shows `6.9.0` as the current upstream Docker version. I updated the Taiga service image tags to `6.9.0`.
- The original access step told readers to use default credentials `admin` / `123123`, but Taiga's official Docker instructions require creating a superuser first. I replaced that with a Portainer-console command to run `python manage.py createsuperuser` in the `taiga-back` container.
- The original conclusion said realtime events were handled "via RabbitMQ" and only mentioned SMTP through `DEFAULT_FROM_EMAIL` and `EMAIL_*`. I corrected the architecture note to reflect the `taiga-events` and `taiga-protected` services and updated the mail configuration note to include `EMAIL_BACKEND`.

## Review Notes
- The embedded Compose YAML was parsed successfully after the fixes. Full `docker compose config` or runtime deployment validation could not be executed in this review workspace because the `docker` CLI is not installed.
- Taiga's official Docker repository still pins older base images such as `postgres:12.3` and `nginx:1.19-alpine`. The post now aligns with the official stack behavior, but those upstream base-image choices may need revisiting in a future refresh.
