# Validation Summary: How to Set Up Multi-Tenant Container Management with Portainer - Setup

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker
- Portainer Agent
- RBAC
- Team-based access control
- Container registries
- Kubernetes namespaces
- REST API

## Sources Consulted
- Portainer docs: Add a new team - https://docs.portainer.io/admin/user/teams/add
- Portainer docs: Add a new user - https://docs.portainer.io/admin/user/add
- Portainer docs: Add a user to a team - https://docs.portainer.io/admin/user/teams/add-user
- Portainer docs: Environments - https://docs.portainer.io/admin/environments/environments
- Portainer docs: Groups - https://docs.portainer.io/admin/environments/groups
- Portainer docs: Roles - https://docs.portainer.io/admin/user/roles
- Portainer docs: Docker roles and permissions - https://docs.portainer.io/advanced/docker-roles-and-permissions
- Portainer docs: Install Portainer Agent on Docker Standalone - https://docs.portainer.io/admin/environments/add/docker/agent
- Portainer docs: Registries (Docker host) - https://docs.portainer.io/user/docker/host/registries
- Portainer docs: Activity logs - https://docs.portainer.io/admin/logs/activity
- Portainer docs: Add a new namespace - https://docs.portainer.io/user/kubernetes/namespaces/add
- Portainer CE 2.39.1 OpenAPI spec - https://api-docs.portainer.io/versions/ce/2.39.1.yaml
- Portainer BE 2.39.1 OpenAPI spec - https://api-docs.portainer.io/versions/ee/2.39.1.yaml

## Issues Found
- The team creation UI path was outdated. The post said `Settings > Teams > Add team`; current docs use `User-related > Teams`, so I corrected the navigation.
- The user-to-team API example used the wrong endpoint and payload. I changed it from `PUT /api/teams/{id}/memberships` with only `UserID` to `POST /api/team_memberships` with `TeamID`, `UserID`, and the required membership `Role`, matching the current OpenAPI spec.
- The environment access section mixed Community Edition access assignment with Business Edition RBAC roles and used outdated role names. I corrected the UI flow to `Environment-related > Environments > Manage access`, replaced the role table with the current built-in BE roles, and removed invalid mappings like `Administrator` as an environment role.
- The environment access API example was incorrect. I replaced `/api/environments/{id}/teams/{teamId}` and `Role` with the current environment update flow on `/api/endpoints/{id}` using `TeamAccessPolicies` and `RoleId`, and noted that role IDs should be taken from `/api/roles`.
- The Portainer Agent deployment command used `portainer/agent:latest` and omitted the current recommended `--restart=always` setting. I updated it to `portainer/agent:lts` with the current documented standalone pattern.
- The registry access navigation was outdated. I changed it from `Registries > [registry] > Access` to the current Docker-host flow: `Host > Registries` then `Manage access`, and clarified that registry access is environment-specific.
- The CE/BE comparison table overstated Portainer capabilities. I corrected it to reflect that CE supports basic environment access assignment, BE adds environment-level and namespace-scoped RBAC, Portainer does not provide custom Portainer roles, and Kubernetes quotas are namespace-level rather than per-team.

## Review Notes
- Portainer’s UI uses the term `Environments`, but the API still uses `/api/endpoints` paths. The post now reflects that distinction.
- The standalone Portainer Agent remains supported, but Portainer’s current documentation labels it a legacy option and recommends the Edge Agent for many new standalone deployments. The post’s standalone example remains valid after correcting the image tag and command shape.
- Built-in role IDs should be discovered from `/api/roles` instead of assumed from older blog examples.
