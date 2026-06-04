# Validation Summary: How to Run Umami Analytics in Docker

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Umami Analytics
- Docker
- Docker Compose
- PostgreSQL
- Next.js
- JavaScript
- REST API
- Traefik
- Nginx

## Sources Consulted
- Umami Installation documentation: https://docs.umami.is/docs/install
- Umami Environment variables documentation: https://docs.umami.is/docs/environment-variables
- Umami Tracker configuration documentation: https://docs.umami.is/docs/tracker-configuration
- Umami Tracker functions documentation: https://v2.umami.is/docs/tracker-functions
- Umami Track events documentation: https://v2.umami.is/docs/track-events
- Umami API authentication documentation: https://docs.umami.is/docs/api/authentication
- Umami API website statistics documentation: https://v2.umami.is/docs/api/website-stats-api
- Umami API users documentation: https://docs.umami.is/docs/api/users
- Umami Share URL documentation: https://docs.umami.is/docs/enable-share-url
- Umami official Docker Compose file: https://raw.githubusercontent.com/umami-software/umami/master/docker-compose.yml
- Docker Compose file reference for obsolete `version`: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Compose service dependency documentation: https://docs.docker.com/reference/compose-file/services/
- PostgreSQL `pg_isready` documentation: https://www.postgresql.org/docs/16/app-pg-isready.html
- Docker Official Image for PostgreSQL: https://hub.docker.com/_/postgres
- Next.js Script guide: https://nextjs.org/docs/app/guides/scripts
- Next.js Pages and Layouts documentation: https://nextjs.org/docs/basic-features/pages

## Issues Found
- The Docker Compose example used the obsolete top-level `version` field. Removed it to match the current Docker Compose Specification.
- The post said Umami supports both PostgreSQL and MySQL. Updated this to reflect current self-hosted Umami documentation, which uses PostgreSQL for current releases.
- The Docker Compose comments described `APP_SECRET` as a hash salt for anonymizing data. Corrected it to a secret used for securing authentication tokens.
- The Umami healthcheck used `wget`, while the official Compose file uses `curl` against `/api/heartbeat`. Updated the healthcheck command to use `curl`.
- The Next.js sample mixed `pages/_app.js` with an App Router root layout and placed `html` / `body` tags in a pattern that is not valid for `pages/_app.js`. Rewrote the sample as an `app/layout.tsx` App Router example using `next/script`.
- The custom event example labeled `umami.track('Product View', ...)` as a page view. Corrected the comment to identify it as a custom event with data.
- The Share URL navigation was out of date. Updated it to match the current flow: Websites, edit the site, and add a Share URL.
- The roles list omitted the documented `view-only` role. Added it.
- The environment variable example used `"false"` for `DISABLE_BOT_CHECK` even though the documented value to disable bot checking is `1`. Corrected the value.
- The environment variable example used `"true"` for `FORCE_SSL`; the documented value is `1`. Corrected the value.
- The `ALLOWED_FRAME_URLS` comment incorrectly described tracker CORS behavior. Corrected it to iframe embedding.
- The update command recreated containers with `docker compose up -d`; updated it to `docker compose up --force-recreate -d`, matching the official repository guidance.

## Review Notes
- The API examples use GNU `date -d`, which is appropriate on typical Linux Docker hosts but will not work unchanged on macOS without GNU coreutils.
- The post uses the GitHub Container Registry image name. Current Umami docs commonly show `docker.umami.is/umami-software/umami`, while Umami's official repository and package registry also publish GitHub Container Registry images.
