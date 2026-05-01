# Validation Summary: How to Deploy Seafile via Portainer

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Portainer
- Seafile Community Edition
- Docker Compose
- MariaDB
- Memcached
- Reverse proxies (Nginx, Traefik)
- OneUptime

## Sources Consulted
- Seafile Admin Manual, "Installation of Seafile Server Community Edition with Docker": https://manual.seafile.com/13.0/setup/setup_ce_by_docker/
- Seafile Admin Manual, "Environment variables": https://manual.seafile.com/13.0/config/env/
- Seafile Admin Manual, "HTTPS and Caddy": https://manual.seafile.com/13.0/setup/caddy/
- Seafile official Seafile Docker compose template: https://manual.seafile.com/13.0/repo/docker/ce/seafile-server.yml
- Seafile official `.env` template: https://manual.seafile.com/13.0/repo/docker/ce/env
- Seafile Admin Manual, Seafile 11 Docker deployment notes for custom published ports: https://manual.seafile.com/11.0/docker/deploy_seafile_with_docker/
- MariaDB Documentation, "MariaDB Server Docker Official Image Environment Variables": https://mariadb.com/docs/server/server-management/automated-mariadb-deployment-and-administration/docker-and-mariadb/mariadb-server-docker-official-image-environment-variables
- Docker Hub, "memcached - Official Image": https://hub.docker.com/_/memcached/
- Portainer Documentation, "Add a new stack": https://docs.portainer.io/user/docker/stacks/add

## Issues Found
- The compose example used older Seafile Docker variables such as `DB_HOST`, `DB_ROOT_PASSWD`, `SEAFILE_ADMIN_EMAIL`, `SEAFILE_ADMIN_PASSWORD`, `SERVICE_URL`, and `SEAFILE_SERVER_LETSENCRYPT`. I replaced them with the current Seafile 13 variables documented by Seafile: `SEAFILE_MYSQL_DB_HOST`, `SEAFILE_MYSQL_DB_USER`, `SEAFILE_MYSQL_DB_PASSWORD`, `INIT_SEAFILE_MYSQL_ROOT_PASSWORD`, `INIT_SEAFILE_ADMIN_EMAIL`, `INIT_SEAFILE_ADMIN_PASSWORD`, `SEAFILE_SERVER_HOSTNAME`, `SEAFILE_SERVER_PROTOCOL`, and `JWT_PRIVATE_KEY`.
- The Seafile image tag was a floating `latest` tag. I changed it to `seafileltd/seafile-mc:13.0-latest` to match the current official Seafile Community Edition Docker template.
- The post said Seafile required Memcached for this setup but did not configure Seafile 13 to actually use it. I added `CACHE_PROVIDER: memcached` plus `MEMCACHED_HOST` and `MEMCACHED_PORT` so the cache service matches the compose stack.
- The Memcached command was updated to the official image’s documented compose style using command arguments, with `--memory-limit=256`.
- The prerequisites were inaccurate for the provided stack because the compose file publishes `8081:80`. I corrected the required port guidance and replaced the obsolete `SERVICE_URL` prerequisite with the current `SEAFILE_SERVER_HOSTNAME`.
- The HTTPS section referenced the old `SEAFILE_SERVER_LETSENCRYPT` flag. Current Seafile Docker documentation handles HTTPS differently, so I updated the post to use `SEAFILE_SERVER_PROTOCOL=https` and `SEAFILE_SERVER_HOSTNAME=seafile.example.com` when running behind a reverse proxy.
- The monitoring section claimed a `200` response on the login page. With Seafile’s web interface, monitoring the root URL can legitimately return a redirect, so I corrected the text to allow `200` or `302`.

## Review Notes
- Seafile 13 recommends Redis as the primary cache service, and Memcached is no longer included in the default Seafile Docker bundle. This post remains technically valid because Seafile still supports Memcached when `CACHE_PROVIDER=memcached` is configured explicitly.
- The post intentionally uses a simplified single compose file for Portainer instead of Seafile’s full upstream `.env` plus `seafile-server.yml` and `caddy.yml` layout.
