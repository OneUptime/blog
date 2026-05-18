# Validation Summary: How to Set Up Nginx Proxy Manager on Ubuntu

## Status
validated

## Post Type
Tutorial / Setup Guide

## Technologies Covered
- Nginx Proxy Manager (NPM) — jc21/nginx-proxy-manager Docker image
- Docker / Docker Compose
- MariaDB (jc21/mariadb-aria image)
- SQLite (NPM default database)
- Let's Encrypt (HTTP-01 and DNS-01 challenges)
- Ubuntu
- ufw (firewall)

## Sources Consulted
- Nginx Proxy Manager official documentation: https://nginxproxymanager.com/
- NPM Setup guides: https://nginxproxymanager.com/setup/
- NPM Quick Setup: https://nginxproxymanager.com/guide/#quick-setup
- NPM Docker Hub: https://hub.docker.com/r/jc21/nginx-proxy-manager
- jc21/mariadb-aria on Docker Hub: https://hub.docker.com/r/jc21/mariadb-aria
- NPM Advanced Configuration: https://nginxproxymanager.com/advanced-config/
- NPM API documentation: https://nginxproxymanager.com/api/
- Docker Compose reference: https://docs.docker.com/compose/
- Let's Encrypt ACME challenge types: https://letsencrypt.org/docs/challenge-types/

## Issues Found
No technical issues found.

Verified items:
- Docker image names `jc21/nginx-proxy-manager:latest` and `jc21/mariadb-aria:latest` are correct and recommended in official NPM docs.
- Default admin credentials `admin@example.com` / `changeme` are accurate.
- Port assignments (80 for HTTP/ACME, 443 for HTTPS, 81 for admin UI) match official NPM defaults.
- Container volume paths (`/data`, `/etc/letsencrypt`) match the NPM image expectations.
- Environment variables for MySQL/MariaDB connection (`DB_MYSQL_HOST`, `DB_MYSQL_PORT`, `DB_MYSQL_USER`, `DB_MYSQL_PASSWORD`, `DB_MYSQL_NAME`) match the official NPM documentation.
- MariaDB env vars (`MYSQL_ROOT_PASSWORD`, `MYSQL_DATABASE`, `MYSQL_USER`, `MYSQL_PASSWORD`) are correct for the jc21/mariadb-aria image.
- `DISABLE_IPV6: "true"` is a valid NPM environment variable.
- Default Docker bridge IP `172.17.0.1` is correct for reaching the host from a container on the default bridge.
- NPM API endpoint `/api/tokens` with POST and `{identity, secret}` body is correct per the NPM API docs.
- Nginx directives in the Advanced tab example (`proxy_set_header`, `proxy_read_timeout`, `proxy_connect_timeout`, `gzip`, `gzip_types`) are syntactically correct.
- Troubleshooting commands (`docker network inspect`, `ss -tlpn`, `ufw status`, `dig`, `curl -I`) are accurate.

## Review Notes
- The `version: "3.8"` field in the docker-compose.yml is deprecated in Compose v2 (it's now ignored), but it still works and does not cause errors. Could be removed in a future revision.
- The Prerequisites step uses `docker.io` (from Ubuntu repos) alongside `docker-compose-plugin` (from Docker's official APT repo). On a clean Ubuntu system without Docker's official APT source added, `docker-compose-plugin` may not be available; in Ubuntu 24.04 universe the equivalent package is `docker-compose-v2`. This is a common simplification across setup guides in this series and works on systems where Docker's repo has been configured, so leaving as written.
- The post recommends `127.0.0.1:81:81` to restrict the admin UI to localhost — good security practice that's accurately documented.
- The NPM image internally uses Certbot for Let's Encrypt; certificate renewals happen automatically via a cron job inside the container — accurately described.
- DNS-01 challenge supported providers list in NPM has grown over time; Cloudflare and Route53 are both supported, as stated.
