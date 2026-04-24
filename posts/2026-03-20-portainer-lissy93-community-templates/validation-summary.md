# Validation Summary: How to Use the Lissy93 Community Templates Collection with Portainer

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Portainer
- Docker
- Portainer application templates
- JSON
- Bash
- Python 3
- GitHub-hosted template catalogs

## Sources Consulted
- Portainer documentation: General settings / App Templates - https://docs.portainer.io/admin/settings/general
- Portainer documentation: Application templates - https://docs.portainer.io/user/docker/templates/application
- Portainer documentation: Deploy a container - https://docs.portainer.io/sts/user/docker/templates/deploy-container
- Portainer documentation: Deploy a stack - https://docs.portainer.io/user/docker/templates/deploy-stack
- Portainer documentation: App template JSON format - https://docs.portainer.io/advanced/app-templates/format
- Portainer documentation: Build and host your own app templates - https://docs.portainer.io/sts/advanced/app-templates/build
- Portainer documentation: CLI `--templates` option - https://docs.portainer.io/advanced/cli
- Lissy93 upstream template collection repository - https://github.com/Lissy93/portainer-templates
- Live Lissy93 template catalog JSON - https://raw.githubusercontent.com/Lissy93/portainer-templates/main/templates.json

## Issues Found
- The post told readers to open `App Templates` from the environment sidebar, but current Portainer documentation uses `Templates` -> `Application`. Updated the navigation steps to match the current UI.
- Several example applications listed in the category overview did not match the live Lissy93 catalog. Replaced them with applications that are present in the current upstream template list.
- The `Vaultwarden` example described a stack deployment with `80 -> 80` and an admin token field. In the current catalog it is a container template with default ports `8010 -> 80` and `3012 -> 3012`, plus a `/data` volume. Updated the example accordingly.
- The `Pi-Hole` example omitted the current default port mappings and included a web password field that is not defined by the template. Updated it to the live template defaults and added the correct default admin URL.
- The `Uptime Kuma` example used a volume path that did not match the live template default. Updated it to `/portainer/Files/AppData/Config/uptime-kuma -> /app/data`.
- The merge example hardcoded top-level template version `2`, but the current Lissy93 template file is version `3`. Updated the script to preserve the upstream version dynamically.
- The cron example implied an `update-merged-templates.sh` script already existed. Clarified that the cron line only applies if the reader saves the merge commands into that script path.
- The production note referred to reviewing each template's Compose file, but Portainer app templates can be either container or stack definitions. Updated the wording accordingly.

## Review Notes
- The live upstream `templates.json` URL is valid as of 2026-04-24 and currently publishes a top-level `version` of `3`.
- Search engine snippets still referenced `templates_v3.json`, but that URL returned `404` during review; the post now points to the live raw URL.
- Portainer's public docs still show some older JSON-format examples with top-level version `2`, so preserving the upstream version in merge scripts is safer than hardcoding a value.
