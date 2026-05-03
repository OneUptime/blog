# Validation Summary: How to Deploy Ghost Blog via Portainer

## Status
validated

## Post Type
Tutorial / Deployment Guide

## Technologies Covered
- Ghost (open-source publishing platform)
- Portainer (Docker management UI)
- Docker / Docker Compose
- MySQL 8.0
- Traefik (reverse proxy with Let's Encrypt)
- Mailgun (SMTP email)
- Ghost Admin API (JWT auth)

## Sources Consulted
- [Ghost Docker official image (Docker Hub)](https://hub.docker.com/_/ghost) — current supported tags (Ghost 6.x bookworm/alpine)
- [Ghost configuration docs](https://docs.ghost.org/config/) — env var double-underscore convention, mail/database keys, default port 2368
- [Ghost Admin API docs](https://docs.ghost.org/admin-api/) — `/ghost/api/admin/posts/` endpoint, `Authorization: Ghost <JWT>` header
- [Ghost 6.0 changelog / release notes](https://ghost.org/changelog/6/) — confirms Ghost 6.0 GA on 2025-08-04 and Node.js v22 requirement
- [Docker Compose container naming](https://docs.docker.com/compose/) — auto-generated `<project>-<service>-<index>` naming behavior

## Issues Found
1. **Outdated Ghost major version.** The stack pinned `ghost:5-alpine`. Ghost 6.0 went GA on 2025-08-04 and is the current LTS as of the post's date (2026-03-20); the supported-tags list on Docker Hub no longer includes Ghost 5 variants. Updated the stack image and the upgrade-instruction comment to `ghost:6-alpine` / `ghost:6.x.y-alpine`.
2. **Backup command would fail due to Compose-generated container names.** The `docker exec ghost-db mysqldump ...` command assumes a literal container name `ghost-db`, but Compose/Portainer auto-generates names like `<stack>-ghost-db-1` unless `container_name` is set. Added `container_name: ghost-db` to the `ghost-db` service so the documented backup command works as written.

## Review Notes
- Database client value `mysql` is correct for Ghost 5/6 (Knex internally maps to the mysql2 driver); no change needed.
- `mail__options__service=Mailgun` is the form shown in Ghost's docs; if a future Nodemailer release drops Mailgun from its well-known services, the user can fall back to the commented `mail__options__host`/`port` lines already in the snippet.
- The example uses Compose `version: "3.8"` — modern Compose v2 ignores this field; harmless to leave for Portainer compatibility.
- The volume reference in the backup command (`ghost_ghost_content`) is correct for a stack named `ghost`, since Compose joins the project name and volume name with an underscore. If the user names the stack differently, both the volume name and the new `ghost-db` container_name (now fixed) need to be reconsidered.
- The Ghost Admin API example omits the `Accept-Version` header — not strictly required for the request to work, so left as-is.
- Ghost 6 requires Node.js v22 in the runtime, but since the official image bundles Node, this is transparent to users running this docker-compose stack.
