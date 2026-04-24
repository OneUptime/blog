# Validation Summary: How to Share Templates Across Multiple Portainer Instances

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer CE and BE
- Docker
- Docker Compose
- Portainer HTTP API
- GitHub Actions
- Make
- Shell scripting
- JSON app templates

## Sources Consulted
- Portainer CLI configuration options: https://docs.portainer.io/advanced/cli
- Portainer general settings: https://docs.portainer.io/admin/settings/general
- Portainer app template JSON format: https://docs.portainer.io/advanced/app-templates/format
- Portainer API access: https://docs.portainer.io/api/access
- Portainer API usage examples: https://docs.portainer.io/api/examples
- Portainer Docker custom templates: https://docs.portainer.io/user/docker/templates/custom
- Portainer Docker roles and permissions: https://docs.portainer.io/advanced/docker-roles-and-permissions
- Portainer source, template fetch implementation: https://github.com/portainer/portainer/blob/develop/api/http/handler/templates/utils_fetch_templates.go
- Portainer source, custom template routes: https://github.com/portainer/portainer/blob/develop/api/http/handler/customtemplates/handler.go
- Portainer source, custom template create handler: https://github.com/portainer/portainer/blob/develop/api/http/handler/customtemplates/customtemplate_create.go
- Portainer source, custom template update handler: https://github.com/portainer/portainer/blob/develop/api/http/handler/customtemplates/customtemplate_update.go
- Portainer source, CLI settings update: https://github.com/portainer/portainer/blob/develop/api/cmd/portainer/main.go

## Issues Found
- The UI instructions used an outdated settings label and described `--templates` as an environment variable. I corrected this to the current settings path and the documented CLI flag usage.
- The container image examples used a floating `:latest` tag. I updated them to `:sts` to match current Portainer documentation.
- The Makefile example had a broken quoted Python command, assumed one reusable token across multiple independent Portainer instances, and counted the wrong JSON shape from `/api/templates`. I changed it to authenticate per instance with `/api/auth` and count `d["templates"]`.
- The Git repository section said repository changes would trigger Portainer stack updates. I corrected this to publishing updated template definitions to the shared template URL.
- The API automation example used the wrong Portainer concept and wrong endpoints: it posted app-template JSON to `/api/custom_templates/1`, which is not a valid current custom-template API route. I replaced it with a BE-only Git-backed custom-template sync example that upserts via `/api/custom_templates/create/repository` and `PUT /api/custom_templates/{id}`.
- The BE section described custom templates as administrator/team/user “levels”. I corrected this to Portainer’s actual access-control model based on resource controls, users, and teams.
- The validation script only treated template type `2` as a stack template. I updated it to validate both stack template types `2` and `3`.

## Review Notes
- Portainer distinguishes between app templates and custom templates. The shared URL and `templates.json` workflow applies to app templates; custom templates remain instance-local unless you copy them between instances through the API.
- Portainer documentation currently recommends tagged images such as `portainer/portainer-ce:sts` rather than floating `:latest` tags.
