# Validation Summary: How to Create and Manage Teams in Portainer

## Status
validated

## Post Type
Tutorial / Admin guide

## Technologies Covered
- Portainer
- Portainer HTTP API
- Portainer RBAC and team management
- Bash
- `curl`
- Python 3 JSON tooling

## Sources Consulted
- Portainer docs: Add a new team — https://docs.portainer.io/admin/user/teams/add
- Portainer docs: Add a user to a team — https://docs.portainer.io/admin/user/teams/add-user
- Portainer docs: Environments / Manage access to environments — https://docs.portainer.io/admin/environments/environments
- Portainer docs: Roles — https://docs.portainer.io/sts/admin/user/roles
- Portainer docs: Authenticate via LDAP — https://docs.portainer.io/sts/admin/settings/authentication/ldap
- Portainer docs: Authenticate via OAuth — https://docs.portainer.io/sts/admin/settings/authentication/oauth
- Portainer docs: API documentation — https://docs.portainer.io/api/docs
- Portainer docs: API usage examples — https://docs.portainer.io/sts/api/examples
- Portainer source: team routes — https://raw.githubusercontent.com/portainer/portainer/develop/api/http/handler/teams/handler.go
- Portainer source: team creation — https://raw.githubusercontent.com/portainer/portainer/develop/api/http/handler/teams/team_create.go
- Portainer source: team update — https://raw.githubusercontent.com/portainer/portainer/develop/api/http/handler/teams/team_update.go
- Portainer source: team deletion — https://raw.githubusercontent.com/portainer/portainer/develop/api/http/handler/teams/team_delete.go
- Portainer source: team memberships listing — https://raw.githubusercontent.com/portainer/portainer/develop/api/http/handler/teams/team_memberships.go
- Portainer source: team membership creation — https://raw.githubusercontent.com/portainer/portainer/develop/api/http/handler/teammemberships/teammembership_create.go
- Portainer source: environment update handler — https://raw.githubusercontent.com/portainer/portainer/develop/api/http/handler/endpoints/endpoint_update.go
- Portainer source: current Teams UI — https://raw.githubusercontent.com/portainer/portainer/develop/app/react/portainer/users/teams/ListView/ListView.tsx
- Portainer source: current team creation form — https://raw.githubusercontent.com/portainer/portainer/develop/app/react/portainer/users/teams/ListView/CreateTeamForm/CreateTeamForm.tsx

## Issues Found
- The UI navigation path was incorrect. The post said `Settings -> Teams`, but current Portainer exposes teams under `User-related -> Teams`, so I corrected the steps.
- The post said a team contains one or more users. Portainer allows creating an empty team, so I changed this to `zero or more users`.
- The post described team leaders without the current external-auth caveat. I clarified that team leader management applies to internally managed teams, because Portainer disables the feature when external authentication with team sync is active.
- The team membership creation example used the wrong endpoint. I changed `POST /api/teams/1/memberships` to `POST /api/team_memberships`; `GET /api/teams/{id}/memberships` remains the correct listing endpoint.
- The environment-access instructions did not match the current UI and hard-coded a role list that is not universally accurate. I updated the UI flow to `Environment-related -> Environments -> Manage access` and removed the fixed role examples.
- The API request examples were normalized to the documented Portainer field names used in official examples.

## Review Notes
- Environment access changes through the API are handled by updating access policies on the environment with `PUT /api/endpoints/{id}`, not through a separate dedicated team-access endpoint.
- Current Portainer docs reviewed on 2026-04-24 span 2.39 LTS and 2.40 STS; the team and team-membership behavior validated here is consistent with the current source.
