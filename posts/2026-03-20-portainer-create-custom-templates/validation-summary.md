# Validation Summary: How to Create Custom Templates in Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker Compose
- Docker Swarm
- Podman
- Git
- Mustache templating

## Sources Consulted
- Portainer documentation: https://docs.portainer.io/user/docker/templates/custom
- Portainer source, Docker sidebar navigation: https://github.com/portainer/portainer/blob/d4114c510dbb4334ef5ebc847f3db58038ba6e65/app/react/sidebar/DockerSidebar.tsx
- Portainer source, custom template create form and build methods: https://github.com/portainer/portainer/blob/d4114c510dbb4334ef5ebc847f3db58038ba6e65/app/react/portainer/templates/custom-templates/CreateView/InnerForm.tsx
- Portainer source, custom template metadata fields: https://github.com/portainer/portainer/blob/d4114c510dbb4334ef5ebc847f3db58038ba6e65/app/react/portainer/custom-templates/components/CommonFields.tsx
- Portainer source, custom template stack type selector: https://github.com/portainer/portainer/blob/d4114c510dbb4334ef5ebc847f3db58038ba6e65/app/react/portainer/custom-templates/components/TemplateTypeSelector.tsx
- Portainer source, custom template variable parsing and rendering: https://github.com/portainer/portainer/blob/d4114c510dbb4334ef5ebc847f3db58038ba6e65/app/react/portainer/custom-templates/components/utils.ts
- Portainer source, custom template actions in the list view: https://github.com/portainer/portainer/blob/d4114c510dbb4334ef5ebc847f3db58038ba6e65/app/react/portainer/templates/custom-templates/ListView/CustomTemplatesListItem.tsx

## Issues Found
- The navigation path was outdated. I changed `App Templates > Custom templates` to the current `Templates > Custom` path shown in Portainer's Docker sidebar and docs.
- The post described custom template types as `Container` and `Stack`, but Portainer's Docker custom templates currently use the stack types `Standalone / Podman` and `Swarm`. I updated both the explanatory table and the metadata example.
- The metadata section referenced an optional `Categories` field that is not present in the current custom template form. I removed it and replaced it with the current optional `Note` field.
- The post treated template variables as generally available, but Portainer enables custom-template variables only in Business Edition. I added that BE caveat where variables are introduced.
- The variable examples used `{{ .variable_name }}` and inline `| default` filters. Portainer parses these templates with Mustache and stores variable defaults in the Variables definition UI, so I changed the examples to plain Mustache variable names and removed unsupported inline default syntax.
- The variable definition example used `default`, but Portainer's variable definition model uses `defaultValue`. I corrected the example accordingly.
- The management section referenced a duplicate action and icon-only edit/delete controls that do not match the current UI. I removed the duplicate subsection and updated the instructions to the current `Edit` and `Delete` actions.

## Review Notes
Validated against current Portainer documentation and Portainer source as of 2026-04-24. The corrected post is accurate for Docker custom templates; Kubernetes custom templates follow a different flow and field set.
