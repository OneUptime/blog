# Validation Summary: How to Configure Health Check to Restart a Container in Podman

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Container health checks
- Container restart behavior
- systemd-managed containers
- nginx
- PostgreSQL
- Redis

## Sources Consulted
- Podman `podman run` documentation: https://docs.podman.io/en/v5.2.0/markdown/podman-run.1.html
- Podman `podman events` documentation: https://docs.podman.io/en/stable/markdown/podman-events.1.html
- Podman `podman container inspect` documentation: https://docs.podman.io/en/latest/markdown/podman-container-inspect.1.html
- Podman `--restart` option documentation: https://docs.podman.io/en/v4.4/markdown/options/restart.html
- Official NGINX Docker image repository and Dockerfile: https://github.com/nginx/docker-nginx
- Docker Hub official NGINX image documentation: https://hub.docker.com/_/nginx

## Issues Found
No technical issues found.

## Review Notes
Podman was not installed in the local workspace, so CLI validation was performed against the official Podman documentation rather than local `--help` output. The post correctly uses `--health-on-failure restart`, correctly warns not to combine that action with `--restart`, and correctly recommends using `kill` or `stop` with systemd-managed containers so systemd can enforce restart policy and limits. The service health check examples depend on the referenced images containing the health check tools; the current official NGINX image Dockerfile includes `curl`, while the PostgreSQL and Redis official images include `pg_isready` and `redis-cli` respectively.
