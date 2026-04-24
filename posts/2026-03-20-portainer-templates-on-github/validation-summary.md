# Validation Summary: How to Host Custom Portainer Templates on GitHub

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Portainer app templates
- Docker Compose
- GitHub repositories and raw content URLs
- Git
- JSON
- YAML

## Sources Consulted
- Portainer docs: Build and host your own app templates — https://docs.portainer.io/advanced/app-templates/build
- Portainer docs: App template JSON format — https://docs.portainer.io/advanced/app-templates/format
- Portainer source: default app templates URL and template model — https://github.com/portainer/portainer/blob/develop/api/portainer.go
- Portainer source: app template fetch behavior — https://github.com/portainer/portainer/blob/develop/api/http/handler/templates/utils_fetch_templates.go
- Portainer source: current settings UI help text/default URL — https://github.com/portainer/portainer/blob/develop/app/react/portainer/settings/SettingsView/ApplicationSettingsPanel/TemplatesUrlSection.tsx
- Portainer official templates catalog — https://raw.githubusercontent.com/portainer/templates/v3/templates.json
- Portainer official WordPress Compose template example — https://raw.githubusercontent.com/portainer/templates/v3/stacks/wordpress/docker-compose.yml

## Issues Found
- The post used the older `version: "2"` catalog format. I updated the example to the current `version: "3"` format and added `id` fields to match Portainer's current default catalog and official templates repository.
- The WordPress and monitoring stack examples were marked as `type: 2`, which is for Swarm stacks. I changed them to `type: 3`, which is the correct Portainer template type for Compose stacks.
- The Compose example used `version: "3.8"` while the Portainer app template docs state that `type: 3` templates are limited to Compose file version `"2"`. I changed the example accordingly.
- The repository layout omitted the `logos/` directory even though the JSON example referenced `logos/nginx.png`. I added that directory to the structure example.
- The update guidance said Portainer fetches the raw file on every access and that changes appear immediately. I corrected this to reflect Portainer's current template-loading behavior and told readers to refresh the **App Templates** view after pushing changes.
- The private repository section said a GitHub PAT could be embedded for Portainer app templates. I replaced that with the correct guidance that GitHub-hosted app template repositories should be public, because Portainer's app template format expects a public Git repository and the settings UI only accepts a URL.

## Review Notes
- Portainer's published app template JSON documentation still shows `version: "2"` examples, but current Portainer releases default to `https://raw.githubusercontent.com/portainer/templates/v3/templates.json` and the official templates repository uses the v3 catalog format.
