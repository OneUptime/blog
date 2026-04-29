# Validation Summary: How to Manage Teams and Roles via the Portainer API

## Status
validated

## Post Type
Guide / API tutorial

## Technologies Covered
- Portainer REST API
- Bash
- curl
- jq
- Portainer teams, team memberships, users, endpoints, and roles

## Sources Consulted
- Portainer Documentation: Accessing the Portainer API - https://docs.portainer.io/api/access
- Portainer Documentation: API usage examples - https://docs.portainer.io/api/examples
- Portainer Documentation: Roles - https://docs.portainer.io/admin/user/roles
- Portainer source (2.39.1): Teams handler - https://github.com/portainer/portainer/blob/2.39.1/api/http/handler/teams/handler.go
- Portainer source (2.39.1): Team memberships handlers - https://github.com/portainer/portainer/blob/2.39.1/api/http/handler/teammemberships/teammembership_create.go
- Portainer source (2.39.1): Team memberships by team route - https://github.com/portainer/portainer/blob/2.39.1/api/http/handler/teams/team_memberships.go
- Portainer source (2.39.1): Endpoint update handler - https://github.com/portainer/portainer/blob/2.39.1/api/http/handler/endpoints/endpoint_update.go
- Portainer source (2.39.1): Endpoints routes - https://github.com/portainer/portainer/blob/2.39.1/api/http/handler/endpoints/handler.go
- Portainer source (2.39.1): User create handler - https://github.com/portainer/portainer/blob/2.39.1/api/http/handler/users/user_create.go
- Portainer source (2.39.1): Core API models - https://github.com/portainer/portainer/blob/2.39.1/api/portainer.go
- Portainer source (2.39.1): Built-in role definitions - https://github.com/portainer/portainer/blob/2.39.1/app/portainer/rbac/models/role.js
- Portainer source (2.39.1): Built-in role names - https://github.com/portainer/portainer/blob/2.39.1/app/portainer/rbac/services/role.service.js

## Issues Found
- The post authenticated access-token requests with `Authorization: Bearer`. Portainer's current API-access-token documentation uses the `X-API-Key` header, while `Authorization: Bearer` is the documented pattern for JWTs returned by `/api/auth`. I updated all examples to use `X-API-Key`.
- The post described `GET /api/teams` as listing all teams. In Portainer 2.39.1, non-administrator users only see teams visible to them. I updated the overview table and listing example text to match the current behavior.
- The post used `PUT /api/endpoints/{id}/access` to grant environment access. In Portainer 2.39.1, endpoint access policies are updated through `PUT /api/endpoints/{id}`. I corrected the route.
- The original environment access payload would replace the entire `TeamAccessPolicies` map and hardcoded `RoleId: 2`, which is an environment role identifier rather than a team membership role. I changed the example to read the current policies, merge the new team policy, and use the Standard user environment role (`RoleId: 3`) explicitly.
- The onboarding script claimed to grant environment access but never used `ENDPOINT_ID`. I added the endpoint policy update step, preserved existing team policies during the update, and made the default environment role explicit.
- The onboarding script implicitly assumed local user creation would always accept a password. Portainer's user-creation handler applies different behavior depending on the configured authentication method. I added a note that the example assumes internal authentication for local user creation.

## Review Notes
- No additional technical issues found after the corrections above.
- Portainer also supports JWT-based API authentication through `POST /api/auth`, but the post now follows the access-token flow that current official API docs emphasize.
- Portainer documents RBAC roles as a Business Edition feature. If this post is later expanded, it would be worth calling out the intended edition explicitly when discussing environment role assignment.
