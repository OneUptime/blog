# Validation Summary: Best Practices for Template Management in Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer App Templates
- Docker container images
- Docker Compose stack templates
- Docker Swarm stack templates
- Edge Stacks

## Sources Consulted
- Portainer docs: Build and host your own app templates - https://docs.portainer.io/advanced/app-templates/build
- Portainer docs: App template JSON format - https://docs.portainer.io/advanced/app-templates/format
- Portainer docs: General settings / App Templates - https://docs.portainer.io/admin/settings/general
- Portainer release notes - https://docs.portainer.io/release-notes
- Portainer official templates repository (v3) - https://github.com/portainer/templates/tree/v3
- Portainer official template schema (v3) - https://raw.githubusercontent.com/portainer/templates/v3/schema.json
- Portainer official WordPress Compose template - https://raw.githubusercontent.com/portainer/templates/v3/stacks/wordpress/docker-compose.yml
- Docker Official Image docs for PostgreSQL - https://github.com/docker-library/docs/tree/master/postgres
- Docker Official Image docs for MySQL - https://github.com/docker-library/docs/tree/master/mysql
- Docker Official Image docs for WordPress - https://github.com/docker-library/docs/tree/master/wordpress

## Issues Found
- The v3 `templates.json` example omitted `id` fields. I added unique `id` values to match Portainer's official v3 schema and template repository.
- The WordPress stack example used `type: 2` while pointing to a Compose stack file. I changed it to `type: 3`, which Portainer documents for Compose stacks.
- The WordPress example exposed `MYSQL_ROOT_PASSWORD` and `WORDPRESS_ADMIN_EMAIL`, but the referenced `stacks/wordpress/docker-compose.yml` expects `MYSQL_DATABASE_PASSWORD` and does not use `WORDPRESS_ADMIN_EMAIL`. I updated the environment-variable example to match the actual stack file.
- The PostgreSQL volume example included a `description` field on a volume object. I removed it to keep the example aligned with the documented template format.
- The "Make required fields visible" snippet contained an inline `//` comment inside a `json` code block, which made the example invalid JSON. I removed the comment and adjusted the wording to reflect the actual behavior more accurately.
- The hosting/configuration instructions implied a Git repository itself was sufficient and used a slightly imprecise UI path. I clarified that Portainer needs an HTTP-accessible URL and that the setting is on the `Settings` page under the `App Templates` section.

## Review Notes
- Portainer's public format page still shows a top-level `version: "2"` example, but Portainer's release notes and official `portainer/templates` `v3` repository show that template version 3 is current and supports edge apps/templates. The post now follows the current official v3 repository format.
