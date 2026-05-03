# Validation Summary: How to Deploy Appwrite via Portainer

## Status
validated

## Post Type
Tutorial / Deployment Guide

## Technologies Covered
- Appwrite (Backend-as-a-Service, v1.5.7)
- Portainer (Docker management UI)
- Docker / Docker Compose
- MariaDB 10.11
- Redis 7
- Appwrite CLI (npm `appwrite-cli`)
- Appwrite REST API

## Sources Consulted
- Appwrite official docker-compose.yml (1.5.x branch): https://github.com/appwrite/appwrite/blob/1.5.x/docker-compose.yml
- Appwrite Docker Hub tags: https://hub.docker.com/r/appwrite/appwrite/tags
- Appwrite CLI installation docs: https://appwrite.io/docs/tooling/command-line/installation
- Appwrite CLI commands reference: https://appwrite.io/docs/tooling/command-line/commands
- Appwrite SDK for CLI repository: https://github.com/appwrite/sdk-for-cli
- Appwrite REST API reference (createDocument): https://appwrite.io/docs/references/cloud/server-rest/databases#createDocument
- Appwrite releases / changelog: https://github.com/appwrite/appwrite/releases and https://appwrite.io/changelog
- MariaDB healthcheck.sh documentation: https://mariadb.com/docs/server/server-management/automated-mariadb-deployment-and-administration/docker-and-mariadb/using-healthcheck-sh

## Issues Found
No technical issues found. Verified items:
- `appwrite/appwrite:1.5.7` is a real, valid Docker Hub tag.
- Worker service uses `entrypoint: worker-functions` — matches upstream syntax (workers use `entrypoint:`, not `command:`).
- Environment variables (`_APP_ENV`, `_APP_OPENSSL_KEY_V1`, `_APP_DOMAIN`, `_APP_DOMAIN_TARGET`, `_APP_REDIS_HOST`, `_APP_REDIS_PORT`, `_APP_DB_HOST`, `_APP_DB_PORT`, `_APP_DB_USER`, `_APP_DB_PASS`, `_APP_DB_SCHEMA`) all match upstream docker-compose.yml for 1.5.x.
- npm package name `appwrite-cli` is correct (the `appwrite` npm package is the JS SDK, not the CLI).
- CLI commands `appwrite login` and `appwrite init project` are valid and documented.
- REST endpoint `/v1/databases/{databaseId}/collections/{collectionId}/documents` (POST) matches the official `createDocument` reference.
- Headers `X-Appwrite-Project`, `X-Appwrite-Key`, and `Content-Type: application/json` are the documented required headers for server-side REST calls.
- Request body shape `{"documentId": "unique()", "data": {...}}` is correct; `"unique()"` is the documented sentinel for auto-generated IDs in REST.
- MariaDB 10.11 image ships `healthcheck.sh` and supports `--connect --innodb_initialized` flags.

## Review Notes
- **Version freshness:** Appwrite 1.5.7 was released May 2024. The latest 1.5.x patch is 1.5.11, and the current stable line as of May 2026 is 1.9.x. The post still works, but readers may want to pin a newer tag.
- **Simplified compose:** The upstream `docker-compose.yml` includes Traefik (for TLS/routing) plus many more workers (databases, deletes, audits, mails, messaging, builds, certificates, webhooks, schedule, maintenance, usage) and an OpenRuntimes executor for functions. The post's stack — main API container + a single `worker-functions` + MariaDB + Redis — is a heavily reduced subset. Some Appwrite features (background DB ops, email delivery, certificate provisioning, audits, function builds) will not function without the corresponding workers/executor. Acceptable simplification for a tutorial, but worth flagging if the author wants production-grade output.
- The post mentions configuring `_APP_SMTP_HOST` and `_APP_STORAGE_LIMIT` for production, both of which are valid Appwrite env vars.
