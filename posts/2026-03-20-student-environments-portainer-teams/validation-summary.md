# Validation Summary: How to Set Up Student Environments with Portainer Teams - Teams

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Portainer CE and Business Edition concepts
- Portainer Teams, Users, environment access, and access control
- Portainer HTTP API
- Docker Standalone environments
- Docker Compose stack files
- Docker container resource limits

## Sources Consulted
- Portainer add Docker Standalone environment documentation: https://docs.portainer.io/admin/environments/add/docker
- Portainer user and team documentation: https://docs.portainer.io/admin/user/users and https://docs.portainer.io/admin/user/teams
- Portainer environment access documentation: https://docs.portainer.io/admin/environments/access
- Portainer access control documentation: https://docs.portainer.io/advanced/access-control
- Portainer API access documentation: https://docs.portainer.io/api/access
- Portainer API documentation index: https://docs.portainer.io/api/docs
- Portainer stack create handler source for 2.39.1: https://github.com/portainer/portainer/blob/2.39.1/api/http/handler/stacks/create_compose_stack.go
- Portainer resource control API handler source for 2.39.1: https://github.com/portainer/portainer/blob/2.39.1/api/http/handler/resourcecontrols/resourcecontrol_update.go
- Portainer Docker container advanced settings documentation: https://docs.portainer.io/user/docker/containers/advanced
- Portainer Docker volumes documentation: https://docs.portainer.io/user/docker/volumes
- Docker Compose version top-level element documentation: https://docs.docker.com/reference/compose-file/version-and-name/

## Issues Found
- The Portainer UI navigation used older **Settings > Users/Teams** and **Environments > Add Environment** labels. Updated the guide to use current **User-related** and **Environment-related** navigation and the **Start Wizard** flow.
- The user creation step listed `Role: Standard User` as if it were set directly on the Add User form. Current Portainer user creation toggles administrator status and environment roles are assigned through access management, so the snippet now uses `Administrator: disabled`.
- The environment access step used `Read-Write`, but current Portainer documentation describes assigning users or teams through **Manage access** with a role dropdown. Updated the example to assign `Standard User`.
- The post implied environment access alone prevents cohorts from seeing each other's resources. Portainer resource visibility also depends on resource access controls, and existing resources are administrator-only by default. Updated the text to require **Restricted** access on each team-owned stack or container.
- The Portainer API example used the removed/old stack creation endpoint `POST /api/stacks`, omitted `endpointId`, and used `Authorization: Bearer` for an API access token. Replaced it with the current `POST /api/stacks/create/standalone/string?endpointId=...` endpoint and the documented `X-API-Key` header.
- The API example claimed to deploy for a specific team but did not assign team ownership. Added a resource-control update using the returned `ResourceControl.Id` and target `TEAM_ID`.
- The Compose snippet used the obsolete top-level `version: "3.8"` field. Removed it and kept the Compose file under the current Compose Specification format.
- The resource-limits section claimed Portainer Business Edition can set Docker Standalone resource limits per team, including a maximum container count. Current Portainer Docker documentation supports per-container resource limits, not a CE per-team maximum-container quota on Docker Standalone. Updated the section to discuss per-container memory/CPU limits and external approaches for hard container-count quotas.
- The student workflow said students can browse volumes without qualification. Portainer volume browsing requires Docker Swarm or the Portainer Agent, so the workflow now qualifies that volume-content browsing is available with the Portainer Agent.

## Review Notes
The shell block parses successfully with `bash -n`. Docker CLI was not available in the workspace, so the Compose snippet was reviewed against the Docker Compose Specification rather than executed with `docker compose config`.
