# Validation Summary: How to Deploy Ghost Blog with Portainer

## Status
validated

## Post Type
Tutorial / Deployment Guide

## Technologies Covered
- Ghost (blogging platform, version 5)
- MySQL 8.0
- Docker / Docker Compose
- Portainer (stacks)
- Traefik (reverse proxy with Let's Encrypt)
- SMTP mail configuration

## Sources Consulted
- Ghost Docker Hub image documentation: https://hub.docker.com/_/ghost
- Ghost official configuration docs: https://docs.ghost.org/config/
- Ghost Docker installation docs: https://docs.ghost.org/install/docker/

## Issues Found
No technical issues found.

Verified items:
- `ghost:5-alpine` is a valid published Docker image tag.
- Default Ghost container port is `2368` — correct.
- Content volume mount path `/var/lib/ghost/content` — correct.
- Ghost configuration environment variable format using double underscores (`__`) for nested keys — correct per Ghost config docs.
- Database env vars (`database__client: mysql`, `database__connection__host`, `database__connection__user`, `database__connection__password`, `database__connection__database`) — all correct.
- Mail env vars (`mail__transport`, `mail__options__host`, `mail__options__port`, `mail__options__auth__user`, `mail__options__auth__pass`) — all correct format.
- `url` env var sets the canonical Ghost URL — correct.
- MySQL 8.0 is the supported production database for Ghost 5.
- MySQL official image variables (`MYSQL_ROOT_PASSWORD`, `MYSQL_DATABASE`, `MYSQL_USER`, `MYSQL_PASSWORD`) — correct.
- Traefik label syntax for routers/services and certresolver — syntactically valid.
- Ghost admin panel served at `/ghost` path — correct.
- Backup commands (volume archive via `alpine tar` and `mysqldump -u ghost -p<pass>`) — valid syntax (no space between `-p` and password is required by mysqldump).

## Review Notes
- `version: "3.8"` is accepted but the top-level `version` field is considered obsolete in modern Docker Compose v2. The stack still works; future versions of the post could drop the `version` line.
- The first backup command uses multiple spaces between flags as a single-line layout. This is valid shell (whitespace collapses) but renders awkwardly; a multi-line `\`-continued form would read better. Not a correctness issue.
- Ghost 6 is now also available; the post intentionally pins to Ghost 5 (`ghost:5-alpine`), which is still supported and documented.
- The Traefik snippet assumes a Traefik instance is already running on the same Docker network with a `letsencrypt` certresolver configured — readers without that prerequisite would need additional setup. Not incorrect, just an unstated assumption.
