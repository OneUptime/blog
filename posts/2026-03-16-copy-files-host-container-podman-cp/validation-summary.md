# Validation Summary: How to Copy Files Between Host and Container with podman cp

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Containers
- NGINX
- PostgreSQL
- Bash shell commands

## Sources Consulted
- Podman `podman cp` official documentation: https://docs.podman.io/en/latest/markdown/podman-cp.1.html
- Podman `podman exec` official documentation: https://docs.podman.io/en/latest/markdown/podman-exec.1.html
- Podman `podman run` official documentation: https://docs.podman.io/en/v5.6.1/markdown/podman-run.1.html
- Podman `podman logs` official documentation: https://docs.podman.io/en/v5.3.2/markdown/podman-logs.1.html
- NGINX web server configuration documentation: https://docs.nginx.com/nginx/admin-guide/web-server/web-server/
- NGINX Docker deployment documentation: https://docs.nginx.com/nginx/admin-guide/installing-nginx/installing-nginx-docker/
- PostgreSQL `pg_dumpall` official documentation: https://www.postgresql.org/docs/current/app-pg-dumpall.html
- PostgreSQL Docker Official Image documentation: https://hub.docker.com/_/postgres/

## Issues Found
- The initial NGINX config example copied only `server_name example.com;` into `/etc/nginx/conf.d/server.conf`. Because NGINX expects virtual server configuration inside a `server` block, this was changed to a minimal valid `server` block.
- The log extraction example copied `/var/log/nginx/access.log` and `/var/log/nginx/error.log` from the official NGINX image. That image links logs to stdout and stderr, so the example was changed to use `podman logs` for `my-app` and left `podman cp` as a commented pattern for containers with regular log files.
- The PostgreSQL backup comments said the backup was created inside the container and then copied to the host, but shell redirection after `podman exec` writes the output on the host. The comments were corrected to describe the actual behavior.
- The cleanup command did not remove `/tmp/custom-nginx.conf` and needed to include `/tmp/nginx.log` after the log example was corrected. The cleanup list was updated.

## Review Notes
Podman was not installed in the local environment, so commands were validated against official documentation rather than executed locally. The `sleep 5` PostgreSQL startup wait is a simple tutorial shortcut; a production script should wait for database readiness explicitly, for example with `pg_isready`.
