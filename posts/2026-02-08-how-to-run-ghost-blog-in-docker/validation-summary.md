# Validation Summary: How to Run Ghost Blog in Docker

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ghost CMS
- Docker
- Docker Compose
- MySQL
- SQLite
- SMTP
- Mailgun
- Ghost Content API
- Ghost Admin API
- Traefik
- Shell backup commands

## Sources Consulted
- Ghost Docker installation docs: https://docs.ghost.org/install/docker/
- Ghost configuration docs: https://docs.ghost.org/config
- Ghost newsletters docs: https://docs.ghost.org/newsletters/
- Ghost Content API docs: https://docs.ghost.org/content-api/
- Ghost Admin API JavaScript client docs: https://docs.ghost.org/admin-api/javascript/
- Docker Official Image for Ghost: https://hub.docker.com/_/ghost/
- Docker Compose services reference: https://docs.docker.com/reference/compose-file/services/
- Docker Compose startup order docs: https://docs.docker.com/compose/how-tos/startup-order/
- Mailgun API overview: https://documentation.mailgun.com/docs/mailgun/api-reference/api-overview

## Issues Found
- The newsletter section incorrectly said SMTP works fine for small Ghost newsletter lists. Updated it to clarify that SMTP is for transactional email, while self-hosted Ghost newsletters require a bulk provider and currently support Mailgun.
- The Mailgun snippet was described as only for larger newsletter lists. Updated the description so it reflects Mailgun use for newsletter delivery and optional transactional email configuration.
- The Docker volume comments said the content volume persisted configuration/settings. Updated them to say it persists themes, images, uploaded files, and local content data; Ghost settings are stored in the database in the MySQL setup.
- The Admin API example passed `html` without `{source: 'html'}`. Updated the `api.posts.add` call to use the documented HTML source option.
- The MySQL backup command expanded `$MYSQL_ROOT_PASSWORD` in the host shell, where the `.env` value is not automatically available. Updated it to expand inside the MySQL container.
- The content backup command did not quote `$(pwd)`. Quoted the bind mount path so it works from directories with spaces.
- The performance snippet described Redis session caching but only configured Ghost HTTP cache headers. Updated the comment to match the actual `caching__frontend__maxAge` setting.

## Review Notes
The article targets `ghost:5-alpine`, and the Admin API example remains on `v5.0` for consistency with that image. Current Ghost documentation also includes Ghost 6 Docker tooling, so a future article refresh could consider updating the whole guide to Ghost 6 rather than mixing major versions.
