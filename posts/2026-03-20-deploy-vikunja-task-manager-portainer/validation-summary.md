# Validation Summary: How to Deploy Vikunja (Task Manager) via Portainer - Task Manager

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Vikunja
- Portainer
- Docker Compose / Portainer Stacks
- PostgreSQL
- Docker volumes and networking

## Sources Consulted
- Vikunja installation documentation: https://vikunja.io/docs/installing/
- Vikunja full Docker example: https://vikunja.io/docs/full-docker-example/
- Vikunja configuration options: https://vikunja.io/docs/config-options/
- Vikunja backup documentation: https://vikunja.io/docs/what-to-backup/
- Vikunja sharing and teams help: https://vikunja.io/help/sharing-and-teams/
- Vikunja projects help: https://vikunja.io/help/projects/
- Vikunja labels help: https://vikunja.io/help/labels/
- Portainer stacks documentation: https://docs.portainer.io/user/docker/stacks
- Portainer add stack documentation: https://docs.portainer.io/user/docker/stacks/add
- Docker Compose file reference: https://docs.docker.com/reference/compose-file/
- Docker Compose version top-level element documentation: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Compose services / depends_on reference: https://docs.docker.com/reference/compose-file/services/
- Docker `exec` documentation: https://docs.docker.com/engine/reference/commandline/exec
- PostgreSQL `pg_isready` documentation: https://www.postgresql.org/docs/16/app-pg-isready.html
- PostgreSQL `pg_dump` documentation: https://www.postgresql.org/docs/17/app-pgdump.html

## Issues Found
- The stack used a non-existent Vikunja image name (`vikunja-task-manager`). Updated it to the official `vikunja/vikunja` image from Vikunja's Docker documentation.
- The stack configured Vikunja with a generic `DATABASE_URL`, but Vikunja's documented Docker configuration uses `VIKUNJA_DATABASE_*` variables plus `VIKUNJA_SERVICE_PUBLICURL` and `VIKUNJA_SERVICE_SECRET`. Replaced the environment block accordingly.
- The application volume path was `/app/data`, which is not Vikunja's documented attachment path in Docker. Corrected it to `/app/vikunja/files`.
- The post exposed Vikunja on port `80` and told readers to browse to `http://host:80`, but Vikunja's documented container listens on port `3456` by default. Updated the published port and access URL to `3456`.
- The PostgreSQL healthcheck was changed to `pg_isready -h localhost -U $$POSTGRES_USER` so it matches current Compose/PostgreSQL usage more closely and avoids hard-coding the username in two places.
- The setup instructions incorrectly described creating an "admin" user, configuring "workspace or organization settings", and inviting users through an "admin panel". Vikunja's current docs describe registering user accounts, creating projects/teams, and sharing projects with users or teams, so the setup steps were corrected.
- The features list mentioned "categories", which is not a current documented Vikunja feature term in this context. Reworded that item to "Labels and filters".
- The backup section used a literal `postgres_container` placeholder and referred to generic application files. Updated the container placeholder to `<postgres-container-name>` and clarified that the backed-up volume contains Vikunja attachment files.
- Removed the top-level Compose `version` field because Docker's current Compose documentation marks it as obsolete and only retained for backward compatibility.

## Review Notes
- The post is technically relevant and salvageable after correction; it remains a valid deployment guide.
- `postgres:16-alpine` is still a valid image choice even though Vikunja's current examples often show newer PostgreSQL majors.
- `VIKUNJA_SERVICE_PUBLICURL`, database passwords, and the Vikunja service secret are placeholders in the snippet and must be replaced before deployment.
- Local checks: `validation.json` was validated with `jq`, and the embedded YAML stack snippet was parsed successfully with Python and `PyYAML`. Docker is not installed in this workspace, so `docker compose config` and live container validation were not possible; Docker/Portainer/Vikunja behavior was verified against official documentation instead.
