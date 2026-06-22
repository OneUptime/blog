# Validation Summary: How to Set Up Docker with Nginx as a Reverse Proxy

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker
- Docker Compose
- Nginx reverse proxy
- Nginx upstream load balancing
- SSL/TLS termination
- Let's Encrypt
- Certbot
- OpenSSL
- WebSocket proxying
- Nginx proxy caching

## Sources Consulted
- Docker Compose file reference: https://docs.docker.com/reference/compose-file/
- Docker Compose version top-level element documentation: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Compose services reference: https://docs.docker.com/reference/compose-file/services/
- Docker Compose `up` CLI reference: https://docs.docker.com/reference/cli/docker/compose/up/
- Nginx `ngx_http_proxy_module` documentation: https://nginx.org/en/docs/http/ngx_http_proxy_module.html
- Nginx `ngx_http_upstream_module` documentation: https://nginx.org/en/docs/http/ngx_http_upstream_module.html
- Nginx HTTP/2 module documentation: https://nginx.org/en/docs/http/ngx_http_v2_module.html
- Nginx WebSocket proxying documentation: https://nginx.org/en/docs/http/websocket.html
- Nginx content caching guide: https://docs.nginx.com/nginx/admin-guide/content-cache/content-caching/
- Certbot user guide: https://eff-certbot.readthedocs.io/en/stable/using.html
- OpenSSL `req` command documentation: https://docs.openssl.org/3.5/man1/openssl-req/

## Issues Found
- The description claimed "automatic container discovery with docker-compose," but the post does not configure automatic Nginx container discovery. Changed it to "Docker Compose integration."
- The Compose examples used the obsolete top-level `version: '3.8'` key. Removed it from all Compose snippets because current Compose uses the Compose Specification and treats `version` as informational/obsolete.
- The load-balancing example used `deploy.replicas` for a Docker Compose scaling example. Replaced it with the current Compose `scale: 3` service attribute.
- The Nginx upstream comment described `max_fails` and `fail_timeout` as Nginx Plus health checks. Changed the comment to "Passive failure handling" because those parameters are available in the open source upstream module; active health checks are the Nginx Plus-only feature.
- The Certbot command used the legacy `docker-compose` command form. Updated it to `docker compose`.
- The reload example used `docker exec nginx`, which assumes a literal container name that Compose does not assign by default, and also used `docker-compose exec`. Updated the commands to service-based `docker compose exec`.

## Review Notes
- The Let's Encrypt example assumes Nginx can already serve `/.well-known/acme-challenge/` on port 80 before initial certificate issuance. A production-ready bootstrap flow may need a temporary HTTP-only Nginx config or temporary certificate before enabling the HTTPS server block.
- Nginx loads certificate files at startup/reload, so deployments should reload Nginx after successful certificate renewals.
