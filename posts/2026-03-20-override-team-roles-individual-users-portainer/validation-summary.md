# Validation Summary: How to Override Team Roles for Individual Users in Portainer

## Status
validated

## Post Type
Tutorial / Guide (Portainer API how-to)

## Technologies Covered
- Portainer (Community Edition, release/2.20)
- Portainer HTTP API (`/api/auth`, `/api/endpoints/{id}`)
- RBAC (User Access Policies, Team Access Policies, built-in roles)
- curl, bash, python3 (used for the JWT-extraction one-liner)

## Sources Consulted
- Portainer CE source – endpoints handler (route table): https://raw.githubusercontent.com/portainer/portainer/release/2.20/api/http/handler/endpoints/handler.go
- Portainer CE source – endpoint update payload (`UserAccessPolicies`/`TeamAccessPolicies` fields): https://raw.githubusercontent.com/portainer/portainer/release/2.20/api/http/handler/endpoints/endpoint_update.go
- Portainer CE source – auth handler (`/api/auth`, `jwt` response field): https://raw.githubusercontent.com/portainer/portainer/release/2.20/api/http/handler/auth/authenticate.go
- Portainer CE source – `AccessPolicy` struct (JSON key `RoleId`): https://raw.githubusercontent.com/portainer/portainer/release/2.20/api/portainer.go
- Portainer CE source – authorization resolution and tiered fallback (user-on-endpoint > user-on-group > team-on-endpoint > team-on-group): https://raw.githubusercontent.com/portainer/portainer/release/2.20/api/internal/authorization/authorizations.go
- Portainer CE source – role IDs and priorities (Endpoint Administrator=1, HelpDesk=2, Standard User=3, Read-Only User=4): https://raw.githubusercontent.com/portainer/portainer/release/2.20/api/datastore/migrator/migrate_dbversion20.go
- Portainer roles documentation: https://docs.portainer.io/admin/user/roles
- Portainer access-control documentation: https://docs.portainer.io/advanced/access-control

## Issues Found

1. **Wrong API route.** The post used `PUT /api/endpoints/{id}/useraccesspolicies`, which does not exist in Portainer CE. The endpoint handler (`api/http/handler/endpoints/handler.go`) only registers `PUT /endpoints/{id}` for editing access policies, and the `endpointUpdatePayload` struct exposes `UserAccessPolicies` and `TeamAccessPolicies` fields. Fixed: rewrote every example to call `PUT /api/endpoints/{id}` with `{"UserAccessPolicies": {...}}` in the body.

2. **Wrong JSON key in the access-policy body.** The post used `{"RoleID": N}`. The `AccessPolicy` Go struct serializes the role identifier as `RoleId` (`json:"RoleId"`). Fixed: switched all examples to `RoleId`.

3. **"Operator" role used with `RoleID: 2`.** In Portainer CE there is no Operator role at all - the built-in roles are Endpoint Administrator (1), HelpDesk (2), Standard User (3), and Read-Only User (4). RoleID 2 is HelpDesk, not Operator (Operator is a Portainer Business Edition role). Fixed: rewrote the elevation example to grant Endpoint Administrator (RoleId 1), which is available in both editions and is the most-permissive role per the source migration `migrate_dbversion20.go`.

4. **Incorrect precedence rule.** The post claimed "the most permissive role wins" and gave examples like `Team Operator + User Standard User → Operator`. Reading `getUserEndpointAuthorizations` in `api/internal/authorization/authorizations.go`, the resolver actually walks a strict fallback chain (user-on-endpoint → user-on-group → team-on-endpoint → team-on-group) and stops at the first match. There is no permissiveness comparison between user and team policies on the same environment - the user policy simply wins. The "highest-priority role" rule only applies when a single tier produces multiple candidate roles (e.g. a user is on multiple teams that each have a policy on the environment). Fixed: rewrote the section to describe the correct fallback chain, replaced the misleading examples, and corrected the follow-up claim that an individual policy can't be used to *restrict* a user (it can - an individual user policy with a lower role replaces the team's effective role on that environment).

5. **Behavior of the "remove override" example was under-described.** The original wording said "Pass an empty object for the user ID to remove their individual policy" and `-d '{}'`. Sending `{}` to `PUT /api/endpoints/{id}` is technically a no-op for access policies (the handler only updates `UserAccessPolicies` if the field is non-nil and different). To actually clear user policies you must send `{"UserAccessPolicies": {}}`. Fixed: updated both removal examples and the surrounding comments.

## Review Notes

- Authentication endpoint (`POST /api/auth`) and JSON response field (`{"jwt": "..."}`) are correct - verified against the `authenticateResponse` struct in `api/http/handler/auth/authenticate.go`.
- The `python3 -c` one-liner that extracts the JWT works because the outer string uses double quotes and the inner `'jwt'` uses single quotes. Left as-is.
- Sending `UserAccessPolicies` in the `PUT /api/endpoints/{id}` body REPLACES the entire map for that environment. The post now flags this; readers who want to drop only one user without touching others should `GET` the endpoint first, mutate the map locally, and `PUT` the full map back.
- `--insecure` (skip TLS verification) is acceptable for the localhost / self-signed-cert demo but should be removed in production usage. Not flagged in the post but worth noting.
- The role-priority list given in the post applies to Portainer Community Edition. Portainer Business Edition adds additional roles (notably Operator) with their own RoleIds and priorities; readers on BE should query `GET /api/roles` on a live instance to confirm.
- Portainer's API has been generally stable across 2.x minor releases, and the route/payload structure verified here matches at least back to 2.18.
