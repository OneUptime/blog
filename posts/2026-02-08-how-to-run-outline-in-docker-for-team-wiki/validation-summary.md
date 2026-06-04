# Validation Summary: How to Run Outline in Docker for Team Wiki

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Outline
- Docker
- Docker Compose
- PostgreSQL
- Redis
- MinIO
- Amazon S3-compatible object storage
- Slack OAuth
- Google OAuth
- Nginx reverse proxying
- WebSockets
- OpenSSL
- curl

## Sources Consulted
- Outline Docker hosting documentation: https://docs.getoutline.com/s/hosting/doc/docker-7pfeLP5a8t
- Outline requirements documentation: https://docs.getoutline.com/s/hosting/doc/requirements-ULdYnwi4wG
- Outline file storage documentation: https://docs.getoutline.com/s/hosting/doc/aws-s3-N4M0T6Ypu7
- Outline `.env.sample`: https://raw.githubusercontent.com/outline/outline/main/.env.sample
- Outline Slack authentication documentation: https://docs.getoutline.com/s/hosting/doc/slack-sgMujR8J9J
- Outline Google authentication documentation: https://docs.getoutline.com/s/hosting/doc/google-hOuvtCmTqQ
- Outline SAML documentation: https://docs.getoutline.com/s/hosting/doc/saml-hCmJIfmAjt
- Outline SSL documentation: https://docs.getoutline.com/s/hosting/doc/ssl-pzk7WO8d1n
- Outline API documentation: https://www.getoutline.com/developers
- Outline users and roles documentation: https://docs.getoutline.com/s/guide/doc/users-groups-cwCxXP8R3V
- Docker Compose file reference: https://docs.docker.com/reference/compose-file/
- Docker Compose networking documentation: https://docs.docker.com/compose/how-tos/networking/
- Docker Compose version element documentation: https://docs.docker.com/reference/compose-file/version-and-name/
- MinIO Client documentation: https://min.io/docs/minio/linux/reference/minio-mc.html
- MinIO `mc mb` documentation: https://min.io/docs/minio/linux/reference/minio-mc/mc-mb.html
- MinIO `mc anonymous set` documentation: https://docs.min.io/community/minio-object-store/reference/minio-mc/mc-anonymous-set.html
- MinIO `mc cors set` documentation: https://docs.min.io/enterprise/aistor-object-store/reference/cli/mc-cors/mc-cors-set/
- NGINX WebSocket proxy documentation: https://nginx.org/en/docs/http/websocket.html

## Issues Found
- The post listed SAML as a generic authentication provider. Outline's SAML support is limited to the licensed Business and Enterprise editions, so the prerequisite now includes that caveat.
- The post described Google authentication without noting the Google Workspace requirement from Outline's hosting documentation. Added that requirement.
- The Compose example used the obsolete top-level `version: "3.8"` key. Removed it to match the current Compose Specification.
- The Outline image used `outlinewiki/outline:latest`. Updated it to the current official hosting documentation image, `docker.getoutline.com/outlinewiki/outline:latest`.
- The S3 configuration omitted `FILE_STORAGE: s3`, so Outline would default to local file storage instead of using MinIO/S3. Added `FILE_STORAGE: s3`.
- The MinIO/S3 upload bucket URL used the internal Docker hostname `http://minio:9000`. Browser uploads need a reachable HTTPS bucket endpoint, so the example now uses `https://minio.your-domain.com` and notes that MinIO's S3 API endpoint must be published over HTTPS.
- The one-off MinIO client container used `--network outline-net`, but Docker Compose would normally create a project-scoped network name. Added `name: outline-net` to the Compose network so the command works as written.
- The MinIO bucket creation command did not configure CORS for browser uploads and was not idempotent. Added `mc mb --ignore-existing` and a CORS configuration for the Outline origin.
- The backup commands wrote to `~/outline-backup` without creating it. Added `mkdir -p ~/outline-backup`.

## Review Notes
The Compose YAML block was validated locally with `docker compose -f - config -q`. The Nginx snippet follows the documented WebSocket proxy pattern, but a production deployment should also include the usual HTTP-to-HTTPS redirect and certificate renewal setup.
