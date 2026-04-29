# Validation Summary: How to Isolate Tenants Using Portainer Teams and Environments

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Portainer HTTP API
- Docker
- Docker Compose
- Portainer Agent
- Registry access control

## Sources Consulted
- Portainer API documentation: https://docs.portainer.io/api/docs
- Portainer CE 2.39.1 OpenAPI spec: https://api-docs.portainer.io/versions/ce/2.39.1.yaml
- Add an environment via the Portainer API: https://docs.portainer.io/admin/environments/add/api
- Environment-related overview: https://docs.portainer.io/admin/environments
- Manage access to environments: https://docs.portainer.io/admin/environments/environments
- Access control: https://docs.portainer.io/sts/advanced/access-control
- Change container ownership: https://docs.portainer.io/user/docker/containers/ownership
- Registries: https://docs.portainer.io/sts/user/docker/host/registries
- FAQ: Why can't my users see anything in the environment they have access to?: https://docs.portainer.io/sts/faqs/troubleshooting/logs-errors-and-debugging/why-cant-my-users-see-anything-in-the-environment-they-have-access-to
- Official Portainer source for endpoint registry access: https://github.com/portainer/portainer/blob/develop/api/http/handler/endpoints/endpoint_registry_access.go
- Official Portainer source for endpoint updates: https://github.com/portainer/portainer/blob/develop/api/http/handler/endpoints/endpoint_update.go

## Issues Found
- Team memberships were being created through `POST /api/teams/{id}/memberships`, but the current API creates them with `POST /api/team_memberships` and requires `TeamID`, `UserID`, and `Role`. I updated both membership examples accordingly.
- The environment creation example used JSON against `/api/endpoints`, but the current API requires `multipart/form-data`. I rewrote the example to use form fields and added the TLS flags Portainer documents for Agent environments.
- The post used a nonexistent `/api/endpoints/{id}/access` endpoint. I corrected this to `PUT /api/endpoints/{id}` with `TeamAccessPolicies` and `UserAccessPolicies`.
- The original text implied that environment access alone exposes tenant workloads. Portainer's documentation states that resources inside an environment are administrator-owned by default, so I updated the introduction, verification notes, Step 4 context, and conclusion to distinguish environment access from resource ownership.
- The access-label example used an undefined team ID variable and an undocumented `io.portainer.accesscontrol.public=false` label. I changed it to Portainer's documented access-control labels and clarified that the label workflow applies to resources Portainer discovers outside of Portainer-managed deployments.
- The registry example used `Type: 1`, which is Quay, not a generic private registry. I corrected this to `Type: 3` for a custom registry.
- The post used a nonexistent `/api/registries/{id}/access` endpoint. I updated the example to use Portainer's per-environment registry access endpoint: `PUT /api/endpoints/{id}/registries/{registryId}`.
- The tenant-structure diagram nested `alpha-staging` under `alpha-production`, which implied one environment existed inside another. I corrected the diagram so both environments sit at the team level.

## Review Notes
- The example uses the Team Leader role, which Portainer documents as intended for internal authentication setups; when teams are synchronized from an external authentication provider, the team leader role is disabled.
- Registry access in Portainer is scoped per environment, so tenants with multiple environments need registry access applied on each relevant environment.
- The example looks up the `Environment administrator` role dynamically via `/api/roles`, which is safer than hardcoding role IDs if Portainer changes role metadata in a future release.
