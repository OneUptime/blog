# Validation Summary: How to Install Paperless-ngx for Document Management on Ubuntu

## Status
validated

## Post Type
Tutorial / Installation guide

## Technologies Covered
- Paperless-ngx (document management system)
- Docker / Docker Compose
- Redis (broker)
- PostgreSQL (database)
- Gotenberg (Office-to-PDF conversion)
- Apache Tika (text extraction from Office documents)
- Nginx (reverse proxy)
- Certbot / Let's Encrypt (TLS)
- Samba (network share for scanner inbox)
- Tesseract OCR

## Sources Consulted
- Paperless-ngx Configuration docs: https://docs.paperless-ngx.com/configuration/
- Paperless-ngx Administration docs: https://docs.paperless-ngx.com/administration/
- Official Paperless-ngx docker-compose templates: https://github.com/paperless-ngx/paperless-ngx/tree/main/docker/compose (specifically `docker-compose.postgres-tika.yml`)
- Gotenberg Docker Hub tags: https://hub.docker.com/r/gotenberg/gotenberg/tags
- Apache Tika Docker Hub: https://hub.docker.com/r/apache/tika

## Issues Found

1. **Invalid Gotenberg Docker image tag.** The post used `docker.io/gotenberg/gotenberg:8.x`. Docker tags do not support wildcards; `8.x` is not a valid tag. Replaced with `docker.io/gotenberg/gotenberg:8` (a valid moving major-version tag that matches the convention used by the official Paperless-ngx compose template, which pins to `8.25`).

2. **Inaccurate description of services.** The post claimed: "Paperless-ngx Docker Compose requires three services: the web server, a worker for background tasks, and a broker (Redis) for task queuing." This is misleading: the worker is not a separate container — the `webserver` image runs both the Django web app and the background consumer/worker internally. The actual minimum is broker + db + webserver, with optional gotenberg + tika (5 services total in this post). Rewrote the sentence to accurately describe the architecture used in the compose file.

## Review Notes
- The `version: "3.8"` field at the top of the compose file is deprecated under the modern Compose Spec and will emit a warning with `docker compose`, but it is harmless and was left as-is to preserve author style.
- `PAPERLESS_OCR_MODE` has a fourth valid value (`skip_noarchive`) in addition to the three the post mentions (`skip`, `redo`, `force`). Not technically wrong, just incomplete — left unchanged since the three listed are the common ones.
- `docker.io` and `docker-compose-plugin` packages: on stock Ubuntu, `docker-compose-plugin` is provided by Docker's official APT repository rather than the Ubuntu universe repo. The combination shown will work only if Docker's official repo has been added (which is common, but unstated). Left unchanged since the same pattern appears in many other posts in this blog.
- The Paperless-ngx upstream compose template pins Gotenberg to a specific minor version (e.g. `8.25`) for reproducibility; the moving `8` tag used after the fix is acceptable but production users may prefer pinning.
