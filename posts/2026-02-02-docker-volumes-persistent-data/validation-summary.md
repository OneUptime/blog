# Validation Summary: How to Use Docker Volumes for Persistent Data

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker (CLI, volumes, bind mounts, tmpfs)
- Docker Compose (volume declarations, external volumes, depends_on conditions)
- PostgreSQL 16 (data directory layout, healthcheck, initdb scripts)
- Redis 7 (RDB/AOF persistence)
- MongoDB 7 (data/configdb paths, root user env vars)
- Nginx (static file serving, SSL cert mounting)
- NFS volume driver
- fixuid (UID remapping at container start)
- Bash scripting

## Sources Consulted
- Local `docker --help` output (Docker 29.4.2) for `docker rm`, `docker volume create`, `docker volume ls`, `docker volume prune`, `docker stop`, `docker system df`
- Docker official documentation: https://docs.docker.com/engine/storage/volumes/
- Docker Compose specification: https://docs.docker.com/reference/compose-file/volumes/
- Docker `--mount` vs `-v` reference: https://docs.docker.com/engine/storage/bind-mounts/
- PostgreSQL official Docker image docs: https://hub.docker.com/_/postgres (PGDATA, /docker-entrypoint-initdb.d, env vars)
- Redis official image / persistence docs: https://redis.io/docs/management/persistence/
- MongoDB official image: https://hub.docker.com/_/mongo (MONGO_INITDB_* env vars, /data/db, /data/configdb)
- Nginx official image: https://hub.docker.com/_/nginx (/usr/share/nginx/html, /etc/nginx/nginx.conf)
- fixuid project: https://github.com/boxboat/fixuid (v0.6.0 release exists)
- Docker 23.0 release notes regarding `docker volume prune` default behavior change

## Issues Found
1. **`docker volume prune` behavior**: The original text stated `docker volume prune` removes "all unused volumes (not attached to any container)". Since Docker 23.0 (Feb 2023), the default behavior of `docker volume prune` only removes unused **anonymous** volumes; named unused volumes require `--all`/`-a`. Fixed the comments and added a separate command line showing `docker volume prune --all` for removing named unused volumes too.
2. **`docker rm -v` description**: The original comment said "Remove volumes along with the container". The `-v` flag on `docker rm` only removes **anonymous** volumes associated with the container — named volumes are preserved. Updated the comment to make this distinction explicit (verified against `docker rm --help` output: "Remove anonymous volumes associated with the container").

## Review Notes
- The `docker-compose.yml` examples use `version: "3.9"`. The top-level `version` key is deprecated in the modern Compose Specification (Compose v2 ignores it with a warning) but it is still accepted and harmless. The author may want to drop it in a future update.
- Third-party volume driver examples (`rexray/ebs`, `azure_file`) are illustrative; many of these community plugins are no longer actively maintained. The post correctly notes that they require external plugins to be installed. For production AWS/Azure use, CSI drivers under Kubernetes or managed services are usually preferred today.
- The mermaid diagram node `F[/var/lib/docker/volumes/]` may render as a parallelogram shape (because mermaid interprets `[/text/]` as a parallelogram). This is a presentation quirk rather than a Docker correctness issue, so left untouched.
- All other commands, flags, image data paths, env var names, healthcheck syntax, Dockerfile RUN instructions (busybox-style `adduser -D` on Alpine, `adduser --disabled-password` on Ubuntu), and Compose service options (`condition: service_completed_successfully`) are accurate.
