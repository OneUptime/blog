# Validation Summary: How to Manage Teams and Roles via the Portainer API - A Practical Guide

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Portainer Business Edition
- Portainer REST API
- Team and team membership management
- Environment access policies / RBAC
- Bash
- `curl`
- `jq`

## Sources Consulted
- Portainer API documentation: https://docs.portainer.io/api/docs
- Portainer roles documentation: https://docs.portainer.io/sts/admin/user/roles
- Portainer environments documentation: https://docs.portainer.io/admin/environments/environments
- Portainer groups documentation: https://docs.portainer.io/admin/environments/groups
- Portainer API access documentation: https://docs.portainer.io/2.21/api/access
- Portainer auth handler (`/auth` JWT response): https://raw.githubusercontent.com/portainer/portainer/2.39.1/api/http/handler/auth/authenticate.go
- Portainer team membership handlers: https://raw.githubusercontent.com/portainer/portainer/2.39.1/api/http/handler/teammemberships/handler.go
- Portainer team membership create handler: https://raw.githubusercontent.com/portainer/portainer/2.39.1/api/http/handler/teammemberships/teammembership_create.go
- Portainer team memberships listing handler: https://raw.githubusercontent.com/portainer/portainer/2.39.1/api/http/handler/teams/team_memberships.go
- Portainer endpoint routes: https://raw.githubusercontent.com/portainer/portainer/2.39.1/api/http/handler/endpoints/handler.go
- Portainer endpoint update handler: https://raw.githubusercontent.com/portainer/portainer/2.39.1/api/http/handler/endpoints/endpoint_update.go
- Portainer auth header handling: https://raw.githubusercontent.com/portainer/portainer/2.39.1/api/http/security/bouncer.go
- Portainer frontend role IDs: https://raw.githubusercontent.com/portainer/portainer/2.39.1/app/portainer/rbac/models/role.js
- Portainer frontend role definitions: https://raw.githubusercontent.com/portainer/portainer/2.39.1/app/portainer/rbac/services/role.service.js

## Issues Found
- The post claimed `Portainer CE or BE` as a prerequisite, but Portainer documents RBAC as a Business Edition feature. I updated the prerequisite and intro to BE.
- The environment role ID mapping was incorrect. The post used `2 = Standard User` and `3 = Read-only User`, but current Portainer role definitions map the examples used here to `3 = Standard User` and `4 = Read-only User`. I corrected the role mapping and example payloads.
- Step 3 used the wrong endpoint for creating memberships. Current Portainer creates memberships with `POST /api/team_memberships` and requires `teamId` in the payload. I corrected both examples.
- Step 4 said it retrieved membership details “with user info”, but the endpoint returns membership objects rather than expanded user records. I corrected the wording.
- Steps 6 and 7 used `/api/endpoints/{id}/teamaccesspolicies` and `/api/endpoints/{id}/useraccesspolicies`, which are not current Portainer routes. Current Portainer updates these via `PUT /api/endpoints/{id}` with `TeamAccessPolicies` or `UserAccessPolicies` in the request body. I replaced those examples.
- The full setup script would have overwritten prior team access policies each time it assigned a new team. I updated the script to read the current endpoint policy map, merge the new entry, and then write it back.

## Review Notes
- The post now consistently uses JWT bearer authentication. Portainer’s current documentation recommends API access tokens in the `X-API-Key` header, while current source still supports `Authorization: Bearer <jwt>`.
- Portainer’s environment documentation notes that policy-managed access can take precedence over direct environment-level assignments.
