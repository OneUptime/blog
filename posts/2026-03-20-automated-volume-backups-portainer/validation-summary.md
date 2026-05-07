# Validation Summary: How to Set Up Automated Container Volume Backups via Portainer (2)

## Status
not-technically-relevant

## Post Type
Tutorial

## Technologies Covered
- Portainer
- Docker Compose / stacks
- Docker volumes
- PostgreSQL
- Redis
- NGINX
- Uptime Kuma
- Bash

## Sources Consulted
- Portainer Docs, "Add a new stack": https://docs.portainer.io/user/docker/stacks/add
- Portainer Docs, "Inspect or edit a stack": https://docs.portainer.io/user/docker/stacks/edit
- Docker Docs, "Compose file reference": https://docs.docker.com/reference/compose-file/
- Docker Docs, "Services": https://docs.docker.com/reference/compose-file/services/
- Docker Docs, "Version and name top-level elements": https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Docs, "Volumes": https://docs.docker.com/engine/storage/volumes/
- Docker Docs, "`docker container exec`": https://docs.docker.com/engine/reference/commandline/exec
- PostgreSQL Docs, "`pg_dump`": https://www.postgresql.org/docs/17/app-pgdump.html
- PostgreSQL Docs, "`pg_isready`": https://www.postgresql.org/docs/16/app-pg-isready.html
- NGINX Docs, "SSL Termination": https://docs.nginx.com/nginx/admin-guide/security-controls/terminating-ssl-http/

## Issues Found
- The post is a topic mismatch. The title and description promise an automated container volume backup guide via Portainer, but most of the article is a generic multi-service application deployment template with placeholders such as `app-image:latest`, `manage.py`, and `app.example.com`.
- The post does not actually configure automation. It provides a `backup.sh` script but never configures a scheduler such as cron, a systemd timer, or a Portainer-managed recurring mechanism, so the central "automated backups" claim is not fulfilled.
- The application workflow is not technically self-consistent. The stack defines an unspecified `app-image:latest`, sets `NODE_ENV`, assumes Django-style `./manage.py` commands, and uses different health endpoints (`/health` in the healthcheck and `/api/health` in verification). These steps cannot be validated as a working deployment because the application is undefined.
- The troubleshooting section contains an incorrect connectivity test: `curl -I http://postgres:5432` sends HTTP traffic to a PostgreSQL server. PostgreSQL health and connectivity should be checked with PostgreSQL tooling such as `pg_isready`, not an HTTP HEAD request.
- The Compose example includes `version: "3.8"`, which is obsolete in the current Compose Specification, and it presents `deploy.resources` as if it will enforce limits everywhere even though Docker documents `deploy` as optional and ignored when not implemented.
- The backup section is incomplete relative to the stated goal. It dumps PostgreSQL and archives only `app-data` and `app-config`, but the stack also defines `postgres-data` and `redis-data` volumes. That means the article does not actually provide a complete container-volume-backup workflow for the stack it defines.
- The backup cleanup command is unsafe as written because `find $BACKUP_DIR -maxdepth 1 -type d -mtime +7 | xargs rm -rf` can target the backup root directory itself when it ages past seven days.

## Review Notes
This post should be removed or fully rewritten rather than copy-edited. The problems are structural, not isolated syntax issues, so editing individual lines would not turn it into a correct Portainer backup tutorial.
