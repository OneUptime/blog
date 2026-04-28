# Validation Summary: How to Deploy Nginx Proxy Manager as a Portainer Stack - Part 2

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Nginx Proxy Manager (jc21/nginx-proxy-manager)
- Portainer (Stacks UI)
- Docker Compose
- MariaDB (jc21/mariadb-aria)
- Docker networking (bridge, external networks)
- Docker volumes / backup with tar

## Sources Consulted
- Nginx Proxy Manager official setup docs: https://nginxproxymanager.com/setup/
- Nginx Proxy Manager guide: https://nginxproxymanager.com/guide/
- Nginx Proxy Manager GitHub repo: https://github.com/NginxProxyManager/nginx-proxy-manager
- Docker Compose specification (depends_on with condition: service_healthy, external networks)
- jc21/mariadb-aria Docker image (linuxserver-style healthcheck.sh script)

## Issues Found
No technical issues found.

Verification details:
- `DB_MYSQL_HOST`, `DB_MYSQL_PORT`, `DB_MYSQL_USER`, `DB_MYSQL_PASSWORD`, `DB_MYSQL_NAME` match the official NPM environment variable names.
- `DISABLE_IPV6` is a valid optional env var documented by NPM.
- Image names `jc21/nginx-proxy-manager:latest` and `jc21/mariadb-aria:latest` are the official images recommended by NPM upstream.
- Exposed ports (80 HTTP, 443 HTTPS, 81 Admin UI) match the official NPM port mapping.
- Default credentials `admin@example.com` / `changeme` are the well-known NPM defaults.
- The MariaDB healthcheck `healthcheck.sh --su-mysql --connect --innodb_initialized` matches the script shipped in the jc21/mariadb-aria image.
- `depends_on` with `condition: service_healthy` is valid Compose long-form syntax and works with the defined service-level healthchecks.
- The external `proxy` network with `external: true` is valid Compose syntax; the corresponding `docker network create proxy` command is correct.
- The backup `docker run` command syntax is valid; `$(date +%Y%m%d)` is expanded by the host shell before being passed to the container, producing a dated archive name.

## Review Notes
- `version: "3.8"` at the top of the compose file is no longer required by the modern Compose Specification (Compose v2 ignores it). It is harmless and still accepted, so it has been left as-is.
- The healthcheck `curl -f http://localhost:81` works because the jc21/nginx-proxy-manager image ships with curl. Some users prefer the image's bundled `/bin/check-health` script, but the curl-based check is functionally equivalent and widely used.
- Pinning to a specific NPM image tag (e.g., `2.12.1`) — as the post recommends in Step 6 — is best practice for production; using `:latest` can lead to unexpected major-version upgrades on container recreation.
- The backup script captures `npm_data` and `npm_letsencrypt` volumes but does not dump the MariaDB database. For a complete restore, a `mysqldump` (or a snapshot of `npm_db_data`) should also be included; this is a possible future improvement rather than a correctness error.
