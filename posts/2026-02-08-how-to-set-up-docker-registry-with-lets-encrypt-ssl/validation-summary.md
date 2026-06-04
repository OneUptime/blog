# Validation Summary: How to Set Up Docker Registry with Let's Encrypt SSL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Docker
- Docker Compose
- Docker Registry / CNCF Distribution
- Nginx
- Let's Encrypt
- Certbot
- HTTP Basic Authentication / htpasswd
- TLS / HTTPS
- S3-compatible registry storage

## Sources Consulted
- CNCF Distribution: Deploy a registry server: https://distribution.github.io/distribution/about/deploying/
- CNCF Distribution: Configuring a registry: https://distribution.github.io/distribution/about/configuration/
- CNCF Distribution: Garbage collection: https://distribution.github.io/distribution/about/garbage-collection/
- CNCF Distribution: S3 storage driver: https://distribution.github.io/distribution/storage-drivers/s3/
- Docker Docs: docker login: https://docs.docker.com/reference/cli/docker/login/
- Docker Docs: docker image tag: https://docs.docker.com/reference/cli/docker/image/tag/
- Docker Docs: docker image push: https://docs.docker.com/reference/cli/docker/image/push/
- Docker Docs: docker image pull: https://docs.docker.com/reference/cli/docker/image/pull/
- Docker Docs: Compose version and name top-level elements: https://docs.docker.com/reference/compose-file/version-and-name/
- Nginx documentation: HTTP basic authentication: https://docs.nginx.com/nginx/admin-guide/security-controls/configuring-http-basic-authentication/
- Nginx documentation: ngx_http_v2_module: https://nginx.org/en/docs/http/ngx_http_v2_module.html
- Nginx documentation: ngx_http_core_module client_max_body_size: https://nginx.org/en/docs/http/ngx_http_core_module.html#client_max_body_size
- Certbot documentation: User guide: https://eff-certbot.readthedocs.io/en/latest/using.html

## Issues Found
- The Docker Compose snippet used the top-level `version: "3.8"` key. Docker Compose now treats the top-level `version` element as obsolete, so it was removed.
- The Nginx HTTPS server used `listen 443 ssl http2;`. In Nginx 1.25.x this emits a deprecation warning; the snippet now uses `listen 443 ssl;` with `http2 on;`, matching the current Nginx HTTP/2 directive.
- The renewal section said to add a deploy hook, but the shown commands performed a manual forced renewal and reload. The wording was corrected to describe a manual renewal reload.
- The cron-based Nginx reload used `docker compose exec` without `-T`, which can fail in cron because no TTY is available. The command now uses `docker compose exec -T`.
- The garbage collection section ran garbage collection inside the live registry container. CNCF Distribution warns that garbage collection should run with the registry read-only or stopped to avoid corrupting uploads. The commands now stop the registry, run garbage collection with `docker compose run --rm --no-deps registry ...`, and start the registry again.

## Review Notes
- The corrected Compose snippet was validated with `docker compose config`.
- The corrected Nginx HTTPS snippet was validated with `nginx:1.25-alpine` and a dummy certificate.
- The Certbot and htpasswd flags used in the post are valid in the current container images checked during review.
