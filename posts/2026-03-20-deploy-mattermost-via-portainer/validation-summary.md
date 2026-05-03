# Validation Summary: How to Deploy Mattermost via Portainer

## Status
validated

## Post Type
Tutorial / Deployment guide

## Technologies Covered
- Mattermost (Team Edition)
- Portainer
- Docker / Docker Compose
- PostgreSQL 16
- Bleve search engine
- SMTP (email notifications)
- OneUptime (monitoring)

## Sources Consulted
- Mattermost official Docker deployment documentation: https://docs.mattermost.com/install/install-docker.html
- Mattermost docker repository: https://github.com/mattermost/docker
- Mattermost configuration settings reference: https://docs.mattermost.com/configure/configuration-settings.html
- Mattermost environment variable mapping: https://docs.mattermost.com/configure/environment-variables.html
- Mattermost system health API: https://api.mattermost.com/#tag/system (GET /api/v4/system/ping)
- PostgreSQL official Docker image: https://hub.docker.com/_/postgres
- Docker Compose file reference: https://docs.docker.com/compose/compose-file/
- Mattermost Team Edition image on Docker Hub: https://hub.docker.com/r/mattermost/mattermost-team-edition

## Issues Found
No technical issues found.

Verifications performed:
- `mattermost/mattermost-team-edition` is the correct official image name on Docker Hub.
- Default Mattermost web port is `8065` (matches the published port).
- Container volume paths `/mattermost/config`, `/mattermost/data`, `/mattermost/logs`, `/mattermost/plugins`, `/mattermost/client/plugins` match the paths used in the official Mattermost docker repo.
- Environment variable names (`MM_SQLSETTINGS_DRIVERNAME`, `MM_SQLSETTINGS_DATASOURCE`, `MM_BLEVESETTINGS_INDEXDIR`, `MM_SERVICESETTINGS_SITEURL`) follow the documented `MM_<SECTION>_<KEY>` mapping convention.
- PostgreSQL DSN format `postgres://user:pass@host:5432/db?sslmode=disable` is valid and supported by Mattermost's pq driver.
- PostgreSQL 16 is supported by current Mattermost releases (Mattermost supports PostgreSQL 11+).
- Health endpoint `GET /api/v4/system/ping` is correct and returns at minimum `{"status":"OK"}` when the server is healthy.
- POSTGRES_DB / POSTGRES_USER / POSTGRES_PASSWORD env vars are the correct initialization variables for the official postgres image.
- Compose file syntax (`version: "3.8"`) is valid; service dependencies, named volumes, and restart policy are well-formed.

## Review Notes
- `version: "3.8"` is now considered obsolete by recent Docker Compose versions (v2+) which ignores the field, but it remains valid and harmless. No change needed.
- The compose file does not mount a volume at `/mattermost/bleve-indexes` even though `MM_BLEVESETTINGS_INDEXDIR` points there. The Bleve index will be rebuilt automatically from the database after a restart, so this is functional but search performance may briefly degrade. Not a technical error.
- The `:latest` tag is convenient for tutorials but pinning to a specific Mattermost version (e.g. `mattermost/mattermost-team-edition:9.11`) is recommended in production to avoid accidental major upgrades.
- The `/api/v4/system/ping` endpoint actually returns additional fields beyond `status` (e.g. `AndroidLatestVersion`, `IosLatestVersion`), but the post's claim about the `status: OK` field is accurate for the purpose of health monitoring.
- For external HTTPS access (referenced via `MM_SERVICESETTINGS_SITEURL`), users will additionally need a reverse proxy (nginx/Traefik/Caddy). The post does not cover this, which is reasonable scoping for a Portainer-focused tutorial.
