# Validation Summary: How to Deploy Wekan (Kanban Board) via Portainer

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- Wekan
- Portainer
- Docker Compose
- MongoDB
- Docker volumes

## Sources Consulted
- Wekan official repository: https://github.com/wekan/wekan
- Wekan official Docker Compose example: https://raw.githubusercontent.com/wekan/wekan/main/docker-compose.yml
- Wekan official user setup docs: https://raw.githubusercontent.com/wekan/wekan/main/docs/Login/Adding-users.md
- Wekan official email configuration docs: https://raw.githubusercontent.com/wekan/wekan/main/docs/Email/Troubleshooting-Mail.md
- Portainer docs for adding stacks: https://docs.portainer.io/user/docker/stacks/add
- Docker Docs on Compose startup order: https://docs.docker.com/compose/how-tos/startup-order/
- MongoDB Database Tools docs for `mongodump`: https://www.mongodb.com/docs/database-tools/mongodump/mongodump-examples/
- Docker Docs on backing up volumes: https://docs.docker.com/engine/storage/volumes/

## Issues Found
- The original stack used a non-official `wekan-kanban` image, a direct PostgreSQL `DATABASE_URL`, and PostgreSQL health and backup commands. Wekan's official Docker deployment uses MongoDB-compatible settings such as `MONGO_URL`, so I replaced the stack with a working Wekan plus MongoDB configuration based on the upstream compose file.
- The original port mapping used `80:80`, but Wekan's official container listens on port `8080`. I corrected the published port to `80:8080`.
- The original application data mount used `/app/data`, which does not match Wekan's documented writable path for uploads. I changed the volume mount to `/data` and added `WRITABLE_PATH=/data`.
- The original setup steps referenced workspace or organization configuration and generic admin-panel SMTP setup. I corrected the flow to Wekan's documented `/sign-up` onboarding, first-user-admin behavior, board-based usage, and environment-variable email configuration using `MAIL_URL` and `MAIL_FROM`.
- The original backup commands used `pg_dump` for PostgreSQL. I replaced them with `mongodump` for the Wekan database and a tar backup for the named uploads volume.

## Review Notes
- Wekan's current upstream compose file also documents an optional FerretDB plus PostgreSQL migration path, but it does not use a direct PostgreSQL `DATABASE_URL` in the Wekan container. The original post's PostgreSQL example was therefore not valid as written.
- The post now uses `ghcr.io/wekan/wekan:latest`, which is one of the official upstream images. Upstream also notes that pinning a specific version tag is preferable for controlled upgrades.
