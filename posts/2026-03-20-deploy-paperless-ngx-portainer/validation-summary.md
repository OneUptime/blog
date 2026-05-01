# Validation Summary: How to Deploy Paperless-ngx via Portainer

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Paperless-ngx
- Portainer
- Docker Compose
- PostgreSQL
- Redis
- OCR
- OneUptime

## Sources Consulted
- Paperless-ngx configuration docs: https://docs.paperless-ngx.com/configuration/
- Paperless-ngx usage docs: https://docs.paperless-ngx.com/usage/
- Paperless-ngx troubleshooting docs: https://docs.paperless-ngx.com/troubleshooting/
- Official Paperless-ngx PostgreSQL compose example: https://raw.githubusercontent.com/paperless-ngx/paperless-ngx/refs/heads/dev/docker/compose/docker-compose.postgres.yml
- Official Paperless-ngx PostgreSQL + Tika/Gotenberg compose example: https://raw.githubusercontent.com/paperless-ngx/paperless-ngx/refs/heads/dev/docker/compose/docker-compose.postgres-tika.yml
- Portainer stack deployment docs: https://docs.portainer.io/user/docker/stacks/add
- Docker Compose file reference for the obsolete top-level `version` key: https://docs.docker.com/reference/compose-file/version-and-name/

## Issues Found
- The post description claimed the stack included Gotenberg, but the provided compose file only configured Paperless-ngx, PostgreSQL, and Redis. I removed the Gotenberg claim so the description matches the actual deployment shown.
- The compose snippet used the top-level `version` key. Current Docker Compose documentation marks that field as obsolete, so I removed it.
- The compose snippet set `PAPERLESS_URL` to `http://paperless.example.com:8000` while the deployment instructions told readers to open `http://<host>:8000`. I changed the example to use the same host placeholder and updated the deployment step to explicitly tell readers to set `PAPERLESS_URL` and `PAPERLESS_SECRET_KEY`.
- The consumption section said users could drop any “document” into the consume directory. The provided stack does not include the optional Tika/Gotenberg services required for broader Office document support, so I narrowed that claim to PDF and image files and clarified that OCR runs when needed.
- The monitoring section implied documents could be lost if the container crashed. With the documented bind-mounted consume directory, the more accurate behavior is that ingestion pauses until the service is restored, so I corrected that wording.

## Review Notes
- The compose snippet is syntactically valid YAML. I could not run `docker compose config` in this workspace because `docker` is not installed.
- Current upstream Paperless-ngx compose templates use newer Redis and PostgreSQL image tags than the post (`redis:8` and `postgres:18` in the current official examples). I did not change the post’s pinned tags because the official documentation consulted here did not mark `redis:7-alpine` or `postgres:16-alpine` as invalid, but they should be reviewed again in a future validation pass.
