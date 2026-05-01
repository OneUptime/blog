# Validation Summary: How to Deploy Taiga (Project Management) via Portainer - Project Management

## Status
validated

## Post Type
Guide

## Technologies Covered
- Taiga
- Portainer
- Docker Compose
- PostgreSQL
- RabbitMQ
- Nginx
- Docker volumes

## Sources Consulted
- Taiga Installation Guide, Docker production setup: https://docs.taiga.io/setup-production.html
- Taiga Backup and Restore: https://docs.taiga.io/backup-and-restore.html
- Taiga Docker README: https://github.com/taigaio/taiga-docker
- Official Taiga Docker Compose file: https://raw.githubusercontent.com/taigaio/taiga-docker/stable/docker-compose.yml
- Official Taiga Docker init Compose file: https://raw.githubusercontent.com/taigaio/taiga-docker/stable/docker-compose-inits.yml
- Official Taiga Docker environment template: https://raw.githubusercontent.com/taigaio/taiga-docker/stable/.env
- Official Taiga gateway config: https://raw.githubusercontent.com/taigaio/taiga-docker/stable/taiga-gateway/taiga.conf
- Taiga backend Dockerfile: https://raw.githubusercontent.com/taigaio/taiga-back/main/docker/Dockerfile
- Portainer Docs, Add a new stack: https://docs.portainer.io/user/docker/stacks/add
- Docker Docs, Version top-level element: https://docs.docker.com/reference/compose-file/version-and-name/

## Issues Found
- The original stack used a non-official single `taiga-project-management` image plus Postgres. Taiga's official Docker deployment is a multi-service stack with `taiga-back`, `taiga-front`, `taiga-events`, `taiga-protected`, RabbitMQ, Postgres, and an Nginx gateway, so I replaced the Compose example with a Portainer-compatible stack based on the official Taiga services.
- The original configuration used a generic `DATABASE_URL`, `app-data` volume, and a simple `80:80` web container model that do not match Taiga's current Docker deployment. I replaced those values with Taiga's official environment variables, service names, data volumes, and gateway routing configuration.
- The original setup instructions implied the first admin user would be created through normal post-deploy UI setup. In Taiga's official Docker flow, the admin user is created with a Django management command, so I corrected the instructions to run `python manage.py createsuperuser` in the `taiga-back` container.
- The original backup commands targeted a generic application volume. Taiga's official backup guidance for Docker is to back up the PostgreSQL database and Taiga media files, so I replaced the commands accordingly.
- The original Compose example used the obsolete top-level `version` field. Current Compose documentation marks that field as obsolete, so I removed it while updating the stack.
- The original summary implied PostgreSQL alone stored all persistent application data. Taiga also persists uploaded files in Docker volumes, so I corrected the summary to reflect both database and media storage.

## Review Notes
- Taiga's current official `stable` Docker stack still pins older base images such as `postgres:12.3` and `nginx:1.19-alpine`. I kept those versions to stay aligned with upstream's documented configuration rather than silently substituting untested versions.
- Taiga's documentation notes that Django admin over plain HTTP may require `SESSION_COOKIE_SECURE` and `CSRF_COOKIE_SECURE` to be disabled. The post no longer tells readers to use the admin panel for normal team invitation flow, which avoids relying on that HTTP-only exception.
- Docker was not installed in this workspace, so I validated the updated stack as YAML locally rather than running `docker compose config`.
