# Validation Summary: How to Use Application Templates in Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker
- Docker Compose / Compose-based stacks
- Portainer application templates
- Portainer custom templates

## Sources Consulted
- Portainer Documentation: Application templates — https://docs.portainer.io/user/docker/templates/application
- Portainer Documentation: Deploy a container — https://docs.portainer.io/user/docker/templates/deploy-container
- Portainer Documentation: Deploy a stack — https://docs.portainer.io/user/docker/templates/deploy-stack
- Portainer Documentation: Custom templates — https://docs.portainer.io/user/docker/templates/custom
- Portainer Documentation: General settings / App Templates — https://docs.portainer.io/admin/settings/general
- Portainer Documentation: App template JSON format — https://docs.portainer.io/advanced/app-templates/format
- Portainer official templates repository — https://github.com/portainer/templates
- Portainer official WordPress compose template — https://raw.githubusercontent.com/portainer/templates/v3/stacks/wordpress/docker-compose.yml
- Lissy93 community template collection — https://github.com/Lissy93/portainer-templates

## Issues Found
- The navigation path was outdated. The post said to click `App Templates` in the sidebar, but current Portainer docs use `Templates` → `Application`. I updated the step to match the current UI.
- The built-in catalog examples included stale or incorrect entries for the current official template set, including `Apache`, `Nextcloud`, `Gitea`, and `Drone CI`. I replaced them with templates present in Portainer's official templates repository, and updated `Apache` to the actual built-in template name `Httpd`.
- The browsing section implied filtering by type via category badges. I updated this to match the current UI and docs: use the search box, category filters, and the `Type` dropdown.
- The WordPress stack deployment example listed several variables that are not part of the current built-in Portainer WordPress template. I replaced it with the actual current built-in input: stack name plus the database root password.
- The WordPress Compose example did not match the current official Portainer WordPress template. I updated the YAML to the current built-in template structure, including Compose version `2`, `mysql:5.7`, the `MYSQL_DATABASE_PASSWORD` variable, and the fixed WordPress/MySQL defaults used by the official template.
- The custom template URL guidance was vague. I updated it to the current documented location: `Settings` → `General` → `App Templates`.

## Review Notes
- Portainer's available built-in templates depend on the template source configured under `Settings` → `General` → `App Templates` and can differ if a custom template URL is used.
- The current official Portainer WordPress built-in template still uses `mysql:5.7` in the Portainer templates repository. That matches the current official template as of April 24, 2026, but production deployments should review image/version choices before reuse.
