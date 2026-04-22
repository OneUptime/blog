# Validation Summary: How to Self-Host a Recipe Manager with Portainer - Self Host

## Status
validated

## Post Type
Tutorial / self-hosting guide

## Technologies Covered
- Mealie
- Portainer
- Docker Compose
- Docker volumes
- SMTP configuration
- Mealie REST API
- curl
- OneUptime monitoring

## Sources Consulted
- Mealie SQLite installation: https://docs.mealie.io/documentation/getting-started/installation/sqlite/
- Mealie installation checklist: https://docs.mealie.io/documentation/getting-started/installation/installation-checklist/
- Mealie backend configuration: https://docs.mealie.io/documentation/getting-started/installation/backend-config/
- Mealie API usage: https://docs.mealie.io/documentation/getting-started/api-usage/
- Mealie bulk URL import guide: https://docs.mealie.io/documentation/community-guide/bulk-url-import/
- Mealie backups and restores: https://docs.mealie.io/documentation/getting-started/usage/backups-and-restoring/
- Mealie logs: https://docs.mealie.io/documentation/getting-started/installation/logs/
- Mealie features: https://docs.mealie.io/documentation/getting-started/features/
- Mealie OpenAPI schema: https://demo.mealie.io/openapi.json
- Docker Compose version top-level element: https://docs.docker.com/reference/compose-file/version-and-name/
- Compose Specification volumes: https://compose-spec.github.io/compose-spec/07-volumes.html
- Docker volume backup documentation: https://docs.docker.com/engine/storage/volumes/#back-up-restore-or-migrate-data-volumes

## Issues Found
- The Compose example used the obsolete top-level `version: "3.8"` field. Removed it to align with current Docker Compose behavior.
- The named volume was mounted but not declared, and the backup command referenced the literal `mealie_data` volume name. Added a top-level volume declaration with `name: mealie_data` so the compose file and backup command refer to the same volume.
- The environment section included outdated or unsupported settings: `API_TOKENS_ENABLED`, `MAX_WORKERS`, and `WEB_CONCURRENCY`. Removed the API token toggle, since Mealie exposes API token management in the user profile, and replaced the worker settings with current `UVICORN_WORKERS`.
- The SMTP example used `SMTP_AUTH_STRATEGY: TLS` but omitted `SMTP_USER` and `SMTP_PASSWORD`, which Mealie documents as required for TLS or SSL SMTP. Added placeholder values.
- The default login email was outdated as `changeme@email.com`. Updated it to the current `changeme@example.com`.
- The storage comments listed specific `/app/data/recipes`, `/app/data/users`, and `/app/data/logs` directories and described backups as automated. Replaced those with the current documented `/app/data` SQLite deployment guidance and `/app/data/mealie.log` log path.
- The raw volume backup command did not mention stopping Mealie first and wrote an archive of `/data` directly. Updated the note to stop Mealie first and changed the command to mount the volume read-only and archive from inside `/data`.
- The URL import section said "any recipe URL" and labeled a single API call as bulk import. Updated the wording to supported URLs and "import through the API."
- The recipe URL import endpoint used the old `/api/recipes/create-url` route. Updated it to the current `/api/recipes/create/url` route.
- The meal planning section used imprecise navigation text and claimed automatic shopping list creation. Updated it to `Meal Planner` and the more general documented shopping list generation wording.
- The monitoring section said `/api/app/about` returns health information. Updated the wording to match the OpenAPI description: it returns general application information.

## Review Notes
- The post still uses `ghcr.io/mealie-recipes/mealie:latest`, which is valid, but Mealie recommends pinning a version tag for production deployments after reading release notes.
- Docker was not installed in the workspace, so the Docker commands could not be executed locally. The YAML snippet was parsed with PyYAML and the commands were checked against official Docker and Mealie documentation.
