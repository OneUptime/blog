# Validation Summary: How to Create Custom Templates from the Web Editor in Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer custom templates
- Docker Compose / Compose Specification
- Mustache templating
- Prometheus
- Grafana

## Sources Consulted
- Portainer custom templates documentation: https://docs.portainer.io/user/docker/templates/custom
- Portainer stack deployment documentation: https://docs.portainer.io/sts/user/docker/stacks/add
- Portainer source code for custom template variable parsing and rendering: https://github.com/portainer/portainer/blob/develop/app/react/portainer/custom-templates/components/utils.ts
- Portainer source code for custom template common fields: https://github.com/portainer/portainer/blob/develop/app/react/portainer/custom-templates/components/CommonFields.tsx
- Portainer source code for auto-detected variable definitions in the web editor: https://github.com/portainer/portainer/blob/develop/app/react/portainer/templates/custom-templates/useParseTemplateOnFileChange.tsx
- Docker Compose file reference: https://docs.docker.com/reference/compose-file/
- Docker Compose `version` top-level element reference: https://docs.docker.com/reference/compose-file/version-and-name/
- Prometheus installation docs: https://prometheus.io/docs/prometheus/latest/installation/
- Prometheus configuration docs: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Grafana Docker configuration docs: https://grafana.com/docs/grafana/latest/setup-grafana/configure-docker/

## Issues Found
- The post said custom templates could be created in Portainer CE or BE. Portainer’s official docs mark Docker custom templates and template variables as Business Edition features, so the prerequisite was corrected to Portainer BE.
- The navigation path was outdated. The current docs use `Templates > Custom` and `Add Custom Template`, not `App Templates > Custom templates`.
- The metadata example included a `Categories` field and used `Type: Stack`. Current Portainer custom templates use `Title`, `Description`, `Note`, `Logo`, `Platform`, and `Type`, with Docker template type options `Standalone / Podman` or `Swarm`.
- The Compose example used unsupported template syntax such as `{{ .variable | default "value" }}` and claimed the leading dot was required. Portainer’s current implementation parses templates with Mustache and auto-detects variables like `{{ variable }}`; defaults are configured in the Variables definition UI, not inline with filters.
- The Compose example used the obsolete top-level `version: "3.8"` field. Current Compose documentation marks the `version` top-level element as obsolete, so it was removed.
- The Prometheus service mounted a named volume over `/etc/prometheus`, which would hide the image’s bundled sample configuration and break the example. The Compose example was updated to persist only Prometheus data.
- The example referenced several variables in the Compose file that were never defined later in the post. The Compose example and variable section were aligned so the documented variables match the actual template.
- The template example included Alertmanager but did not provide the configuration needed to demonstrate a working alerting setup. The sample was simplified to a working Prometheus and Grafana stack.
- The variable-definition examples were shown as JSON with a `default` property and instructions to click `Add variable`. In the current web-editor flow, Portainer auto-detects variable names from the template and you complete the detected variables’ label, description, and default value fields instead.
- The editing section used the old `App Templates > Custom templates` path and was updated to `Templates > Custom`.

## Review Notes
- The sample now matches the current Portainer custom-template workflow, but it still uses floating container tags (`prom/prometheus`, `grafana/grafana`). That is acceptable for a UI-focused tutorial, though pinning explicit tags would be better for reproducible production deployments.
