# Validation Summary: How to Self-Host a Recipe Manager with Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker Compose
- Docker volumes and networks
- Mealie
- PostgreSQL
- SQLite
- Traefik
- REST API / `curl`
- Bash

## Sources Consulted
- Mealie installation checklist: https://docs.mealie.io/documentation/getting-started/installation/installation-checklist/
- Mealie SQLite install guide: https://docs.mealie.io/documentation/getting-started/installation/sqlite/
- Mealie PostgreSQL install guide: https://docs.mealie.io/documentation/getting-started/installation/postgres/
- Mealie backend configuration: https://docs.mealie.io/documentation/getting-started/installation/backend-config/
- Mealie features: https://docs.mealie.io/documentation/getting-started/features/
- Mealie API usage: https://docs.mealie.io/documentation/getting-started/api-usage/
- Mealie backup and restoring: https://docs.mealie.io/documentation/getting-started/usage/backups-and-restoring/
- Mealie live OpenAPI schema: https://demo.mealie.io/openapi.json
- Mealie source: settings defaults and worker config: https://github.com/mealie-recipes/mealie/blob/mealie-next/mealie/core/settings/settings.py
- Mealie source: recipe import routes: https://github.com/mealie-recipes/mealie/blob/mealie-next/mealie/routes/recipe/recipe_crud_routes.py
- Mealie source: meal plan routes: https://github.com/mealie-recipes/mealie/blob/mealie-next/mealie/routes/households/controller_mealplan.py
- Mealie source: shopping list routes: https://github.com/mealie-recipes/mealie/blob/mealie-next/mealie/routes/households/controller_shopping_lists.py
- Mealie releases: https://github.com/mealie-recipes/mealie/releases/tag/v3.16.0
- Docker Compose file reference: https://docs.docker.com/reference/compose-file/
- Docker Compose `version` top-level element: https://docs.docker.com/reference/compose-file/version-and-name/
- Portainer stack deployment docs: https://docs.portainer.io/user/docker/stacks/add?fallback=true

## Issues Found
- The post used the obsolete Compose `version` field and `ghcr.io/mealie-recipes/mealie:latest`. I removed the `version` key and pinned the image to the current release, `v3.16.0`, which matches Mealie's current documentation and latest release as of 2026-04-23.
- The compose examples set `DEFAULT_PASSWORD`, `MAX_WORKERS`, and `WEB_CONCURRENCY`. Current Mealie documentation/source uses `UVICORN_WORKERS` for worker tuning and treats the default email/password as built-in first-login credentials rather than end-user deployment settings, so I removed the outdated variables and replaced them with accurate first-login guidance.
- The introduction and conclusion claimed Mealie can import from "any website". Official docs describe imports from hundreds of supported recipe sites, so I narrowed that wording.
- The recipe import API examples used outdated endpoints (`/api/recipes/create-url` and `/api/recipes/create-from-zip`) and unsupported format claims. I corrected them to `/api/recipes/create/url` and `/api/recipes/create/zip`, and rewrote the migration note to match Mealie's documented `/group/migrations` flow.
- The meal-planning and shopping-list API examples used old group-scoped paths and an invalid payload for adding recipe ingredients to a shopping list. I updated them to the current household-scoped endpoints and current request body shape from the OpenAPI schema.
- The mobile section claimed Mealie has official App Store and Play Store apps. Current Mealie docs describe a Progressive Web App, so I changed the section to PWA setup.
- The scraper section described enabling extra scrapers and queried a nonexistent `recipeScrapers` field from `/api/app/about`. I replaced that with a valid bulk URL import example using `/api/recipes/create/url/bulk`.
- The backup script implicitly applied to every deployment even though it only fits the PostgreSQL example. I scoped it to PostgreSQL and added the documented SQLite note to stop the container and back up `/app/data`.
- The prerequisite of "At least 512MB RAM" did not match current Mealie compose examples, which recommend a 1000M memory limit. I updated the prerequisite to reflect the current recommendation.

## Review Notes
- Mealie's public demo OpenAPI currently reports `nightly`; I cross-checked the route shapes against the official repository and current stable documentation before updating the examples.
- Mealie's installation checklist still mentions `DEFAULT_EMAIL`, but the current source comments say the default email/password should no longer be set by end users. The post now follows the built-in default-credentials flow instead of configuring a custom default password through Compose.
- The post's `postgres:15-alpine` image remains valid, although Mealie's current example compose files use `postgres:17`.
