# Validation Summary: How to Self-Host a Bookmark Manager with Portainer

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Portainer
- Docker Compose
- Linkwarden
- PostgreSQL
- Shiori
- Wallabag
- MariaDB
- Traefik

## Sources Consulted
- Docker Compose file reference: https://docs.docker.com/reference/compose-file/
- Docker Compose `version` field status: https://docs.docker.com/reference/compose-file/version-and-name/
- Linkwarden installation docs: https://docs.linkwarden.app/self-hosting/installation
- Linkwarden environment variables: https://docs.linkwarden.app/self-hosting/environment-variables
- Linkwarden browser extension docs: https://docs.linkwarden.app/getting-started/browser-extension
- Linkwarden profile settings/import docs: https://docs.linkwarden.app/Usage/profile-settings
- Linkwarden official Docker Compose example: https://raw.githubusercontent.com/linkwarden/linkwarden/main/docker-compose.yml
- Linkwarden official environment sample: https://raw.githubusercontent.com/linkwarden/linkwarden/main/.env.sample
- Shiori configuration docs: https://raw.githubusercontent.com/go-shiori/shiori/master/docs/Configuration.md
- Shiori CLI docs: https://raw.githubusercontent.com/go-shiori/shiori/master/docs/CLI.md
- Shiori usage docs: https://raw.githubusercontent.com/go-shiori/shiori/master/docs/Usage.md
- Shiori official Docker Compose example: https://raw.githubusercontent.com/go-shiori/shiori/master/docker-compose.yaml
- Shiori web extension README: https://raw.githubusercontent.com/go-shiori/shiori-web-ext/master/README.md
- Shiori current CLI help verified from the published container image `ghcr.io/go-shiori/shiori:latest` (`shiori --help`, `add --help`, `print --help`, `update --help`, `delete --help`, `export --help`)
- Wallabag official Docker image README: https://raw.githubusercontent.com/wallabag/docker/master/README.md

## Issues Found
- Removed the top-level Compose `version` field from all three YAML examples because Docker now marks it as obsolete.
- Updated the Linkwarden PostgreSQL image from `postgres:15-alpine` to `postgres:16-alpine` to match current upstream installation guidance.
- Fixed Linkwarden `NEXTAUTH_URL` to include the required `/api/v1/auth` suffix, which Linkwarden documents as mandatory for authentication callbacks.
- Removed `DISABLE_REGISTRATION=false` from the Linkwarden example because it is not a current documented Linkwarden environment variable.
- Added `SHIORI_HTTP_SECRET_KEY` to the Shiori example because current Shiori documentation marks it as required for stable HTTP sessions.
- Replaced Shiori’s old PostgreSQL environment variable example (`SHIORI_DBMS` plus `SHIORI_PG_*`) with the current `SHIORI_DATABASE_URL` format documented upstream.
- Corrected the Shiori CLI search example from `shiori search` to `shiori print -s`, which is the current supported CLI search flow.
- Replaced the Wallabag mail settings (`SYMFONY__ENV__MAILER_HOST`, `..._USER`, `..._PASSWORD`) with the current `SYMFONY__ENV__MAILER_DSN` variable used by the official image.
- Added `SYMFONY__ENV__DATABASE_CHARSET=utf8mb4` to the Wallabag MySQL example to align with the official compose example.
- Updated the Wallabag bind target to `/var/www/wallabag/web/assets/images`, which is the path persisted by the official Docker setup.
- Replaced the unofficial Shiori extension link with the official `go-shiori/shiori-web-ext` release source.
- Updated the Linkwarden browser extension setup text to match the current official login flow using instance address plus username/email and password.

## Review Notes
- The post is technically valid after correction.
- The app images still use `:latest`; this is functional, but pinning explicit versions would make the guide more reproducible over time.
