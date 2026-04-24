# Validation Summary: How to Build a Custom Template Definition JSON File for Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker
- Docker Compose
- Docker Swarm
- JSON

## Sources Consulted
- Portainer documentation: App template JSON format - https://docs.portainer.io/advanced/app-templates/format
- Portainer documentation: Build and host your own app templates - https://docs.portainer.io/advanced/app-templates/build
- Official Portainer templates repository - https://github.com/portainer/templates
- Official Portainer v2 template file - https://raw.githubusercontent.com/portainer/templates/master/templates-2.0.json
- Official Portainer v3 template file - https://raw.githubusercontent.com/portainer/templates/v3/templates.json

## Issues Found
- The post had the stack template type mapping reversed. Portainer documents `type: 2` as a Swarm stack and `type: 3` as a Compose stack, so I corrected the table and changed the repository-based WordPress example to `type: 3`.
- The sentence saying the top-level `version` field "must" be `"2"` for Portainer 2.x was too broad. I clarified that the post's examples use Portainer's documented v2 app template format.
- The post described its examples and field listings as a "complete" or "full" reference, but it omitted documented fields. I adjusted that wording so it no longer overstates coverage.
- The environment variable field description said `label` is always required. Portainer's documentation says `label` is required unless `select` is present, so I corrected that line.
- The validation script only treated `type: 2` as a stack template. I updated it so both `type: 2` and `type: 3` require a `repository` object.

## Review Notes
- Portainer's documentation page for app template format currently documents the v2 schema, while the official `portainer/templates` repository also publishes a v3 template file.
- Portainer documents additional fields beyond the ones listed in this post, including fields such as `name`, `registry`, and administrator-only flags.
