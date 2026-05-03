# Validation Summary: How to Deploy Baserow via Portainer

## Status
validated

## Post Type
Tutorial / Deployment Guide

## Technologies Covered
- Baserow (all-in-one Docker image `baserow/baserow:1.25.2`)
- Portainer (stack deployment)
- Docker / Docker Compose
- PostgreSQL 15 (external)
- Redis 7 (external)
- Baserow REST API (JWT auth, database row endpoints)
- SMTP email configuration

## Sources Consulted
- Baserow Docker installation docs: https://baserow.io/docs/installation/install-with-docker (env var names for `DATABASE_*`, `REDIS_*`/`REDIS_URL`, `EMAIL_SMTP_*`, `BASEROW_PUBLIC_URL`, `SECRET_KEY`)
- Baserow REST API docs: https://baserow.io/docs/apis/rest-api (token-auth endpoint, JWT vs Database Token, Authorization header format)
- Baserow API reference: https://api.baserow.io/api/redoc/

## Issues Found
1. **Incorrect Authorization header for JWT.** The original example obtained a token from `POST /api/user/token-auth/` (which returns a JWT) and then sent requests with `Authorization: Token <token>`. Per Baserow's docs, JWTs must be sent with `Authorization: JWT <token>`. The `Token` prefix is reserved for Database Tokens, which are a separate token type created in the workspace UI. Updated the `Authorization` headers in the row examples to `JWT <your-jwt>` and added a short note pointing readers to Database Tokens for long-lived programmatic access.
2. **Wrong credential field name.** The `token-auth` request body used `"username"`. The Baserow endpoint accepts `email` (and `password`). Updated the JSON body to use `"email"`.

## Review Notes
- `REDIS_URL` is supported by the all-in-one image (alongside the individual `REDIS_HOST`/`REDIS_PORT`/etc. variables), so the compose file's use of `REDIS_URL=redis://baserow_redis:6379` is valid.
- `BASEROW_PUBLIC_URL=http://...` is fine for the local/Portainer scenario described, but for production with TLS the value should switch to `https://...` so the bundled Caddy provisions a certificate on port 443 (already mapped).
- JWTs returned by `/api/user/token-auth/` expire after 60 minutes; the post now mentions Database Tokens as the appropriate option for scripts and integrations.
- The `baserow/baserow:1.25.2` tag is a real published image tag; readers may wish to pin to a newer patch release over time.
- Compose file uses the (now informational) `version: "3.8"` key — harmless, still accepted by Docker Compose v2.
