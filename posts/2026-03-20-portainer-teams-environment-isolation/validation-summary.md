# Validation Summary: How to Isolate Tenants Using Portainer Teams and Environments (2)

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer teams and environment access control
- Portainer HTTP API with `curl` and `jq`
- Portainer registry access management
- Docker networking and Docker Compose network configuration

## Sources Consulted
- Portainer API access docs: https://docs.portainer.io/api/access
- Portainer API docs index: https://docs.portainer.io/api/docs
- Portainer environment access docs: https://docs.portainer.io/admin/environments/environments
- Portainer environment group docs: https://docs.portainer.io/admin/environments/groups
- Portainer roles docs: https://docs.portainer.io/admin/user/roles
- Portainer registry access docs for Docker environments: https://docs.portainer.io/user/docker/host/registries
- Official Portainer source, team membership creation handler: https://github.com/portainer/portainer/blob/develop/api/http/handler/teammemberships/teammembership_create.go
- Official Portainer source, users handler: https://github.com/portainer/portainer/blob/develop/api/http/handler/users/user_create.go
- Official Portainer source, endpoints handler routes: https://github.com/portainer/portainer/blob/develop/api/http/handler/endpoints/handler.go
- Official Portainer source, endpoint update payload: https://github.com/portainer/portainer/blob/develop/api/http/handler/endpoints/endpoint_update.go
- Official Portainer source, auth handler: https://github.com/portainer/portainer/blob/develop/api/http/handler/auth/authenticate.go
- Docker Compose network reference: https://docs.docker.com/reference/compose-file/networks/
- Docker Compose networking guide: https://docs.docker.com/compose/how-tos/networking/

## Issues Found
- The post used `POST /api/teams/{id}/memberships` to add a user to a team. Current Portainer uses `POST /api/team_memberships` for creation and requires `UserID`, `TeamID`, and the membership `Role`. I corrected the example payload and endpoint.
- The post used `/api/environments` API paths for listing and updating environments. Current Portainer API routes use `/api/endpoints`, including `PUT /api/endpoints/{id}` for updating access policies and `GET /api/endpoints` for listing visible environments. I corrected those commands.
- The post hardcoded `role 2 = Operator` when granting team access to an environment. That mapping was not reliable for the current API example, so I changed the post to query `/api/roles` and use the returned role ID instead of assuming a fixed numeric value.
- The network isolation example claimed that setting an explicit Compose network `name` avoids accidental overlap. Docker documents that `name` is used as-is and is not scoped with the project name, so that advice could create collisions across tenant stacks. I replaced it with a dedicated user-defined `internal` network example and corrected the explanation.
- The registry isolation section implied the access setting was global. Portainer documents registry access as scoped to the selected environment, so I clarified that the restriction applies within the relevant environment.

## Review Notes
- Portainer’s UI uses the term "environment", but the current API routes still use `endpoints`.
- JWT authentication via `POST /api/auth` and `Authorization: Bearer ...` remains valid, although Portainer’s API access docs currently recommend per-user access tokens via `X-API-Key`.
- Portainer Community Edition supports basic user and team assignments, while full RBAC role modeling is documented as a Portainer Business Edition feature.
