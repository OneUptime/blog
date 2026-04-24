# Validation Summary: How to Set Up Student Environments with Portainer Teams

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer Business Edition
- Portainer API
- Portainer RBAC, teams, and environment access policies
- Kubernetes namespaces and RBAC
- Docker Compose app templates
- Bash, `curl`, `kubectl`, and Python 3

## Sources Consulted
- Portainer docs: https://docs.portainer.io/api/access.md
- Portainer docs: https://docs.portainer.io/api/examples.md
- Portainer docs: https://docs.portainer.io/admin/user.md
- Portainer docs: https://docs.portainer.io/admin/user/add.md
- Portainer docs: https://docs.portainer.io/admin/user/teams.md
- Portainer docs: https://docs.portainer.io/admin/user/teams/add.md
- Portainer docs: https://docs.portainer.io/admin/environments/environments.md
- Portainer docs: https://docs.portainer.io/2.33-lts/user/kubernetes/namespaces/access.md
- Portainer docs: https://docs.portainer.io/advanced/kubernetes-roles-and-bindings.md
- Portainer docs: https://docs.portainer.io/advanced/app-templates/format.md
- Portainer docs: https://docs.portainer.io/advanced/app-templates/build.md
- Portainer source: https://raw.githubusercontent.com/portainer/portainer/develop/api/http/handler/teams/team_create.go
- Portainer source: https://raw.githubusercontent.com/portainer/portainer/develop/api/http/handler/users/user_create.go
- Portainer source: https://raw.githubusercontent.com/portainer/portainer/develop/api/http/handler/teammemberships/teammembership_create.go
- Portainer source: https://raw.githubusercontent.com/portainer/portainer/develop/api/http/handler/endpoints/endpoint_update.go
- Portainer source: https://raw.githubusercontent.com/portainer/portainer/develop/app/portainer/rbac/models/role.js
- Docker examples: https://github.com/docker/awesome-compose
- Docker example compose file: https://raw.githubusercontent.com/docker/awesome-compose/master/nginx-golang/compose.yaml
- Docker example compose file: https://raw.githubusercontent.com/docker/awesome-compose/master/wordpress-mysql/compose.yaml

## Issues Found
- The post described Portainer teams and RBAC as if they were general Portainer features. I corrected the wording to make clear that this workflow depends on Portainer Business Edition, because teams and RBAC are BE features.
- The team creation UI path was outdated. I changed `Settings > Teams > Add Team` to the current `User-related > Teams > Add Team` path.
- The API authentication examples used `Authorization: Bearer` everywhere with a generic admin token. I corrected the scripts to use a Portainer access token in the `X-API-Key` header, which is the documented pattern for token-based API automation.
- The user creation request body used incorrect lowercase field names. I changed it to the current API payload fields: `Username`, `Password`, and `Role`.
- The team membership example used an outdated endpoint. I replaced it with the current `POST /api/team_memberships` call using `UserID`, `TeamID`, and membership `Role`.
- The environment access example used incorrect `RoleId` guidance. I updated the role mapping to current Portainer role IDs and changed the example assignment to `RoleId: 3` for `Standard User`.
- The guide omitted an important authentication caveat for student account creation. I added that password-based user creation assumes Portainer internal authentication and does not work when LDAP or OAuth authentication is enabled.
- The namespace access UI path was outdated and the Kubernetes RBAC prerequisite was missing. I updated the path to `Namespaces > Manage access` and added the RBAC requirement.
- The app template example used an invalid top-level JSON shape and incorrect template type values. I changed it to the documented `version` plus `templates` wrapper and changed the templates from `type: 2` (Swarm stack) to `type: 3` (Compose stack).
- The app template note incorrectly implied localhost access. I changed it to use the environment's public URL and the correct exposed port.
- The example GitHub repository for the lab templates returned 404. I replaced it with verified public Docker example repositories and matching compose file paths.

## Review Notes
- The guide now accurately targets Portainer Business Edition and assumes internal authentication for scripted student account provisioning.
- Portainer also supports JWT authentication via `/api/auth`, but access-token-based automation is the better fit for the long-lived scripting pattern shown here.
- The environment role IDs were verified from current Portainer source. If Portainer changes its built-in RBAC role definitions in a future release, that mapping should be rechecked.
