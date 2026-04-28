# Validation Summary: How to Set Up Multi-Tenant Container Management with Portainer

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Portainer (CE and Business Edition)
- Portainer HTTP API (`/api/users`, `/api/teams`, `/api/team_memberships`, `/api/endpoints`, `/api/endpoints/{id}/settings`)
- Docker / Docker Compose
- Docker bridge networks and IPAM-based subnet isolation
- Portainer Agent (TCP port 9001)

## Sources Consulted
- [Portainer API access docs (X-API-Key vs Bearer)](https://docs.portainer.io/api/access)
- [Portainer source: `api/portainer.go` (UserRole, TeamRole, EndpointType constants)](https://github.com/portainer/portainer/blob/develop/api/portainer.go)
- [Portainer source: `api/http/handler/teammemberships/handler.go` (POST `/team_memberships`)](https://github.com/portainer/portainer/tree/develop/api/http/handler/teammemberships)
- [Portainer source: `api/http/handler/teams/handler.go` (GET only on `/teams/{id}/memberships`)](https://github.com/portainer/portainer/tree/develop/api/http/handler/teams)
- [Portainer source: `api/http/handler/endpoints/handler.go` (route table; no `/access` route)](https://github.com/portainer/portainer/tree/develop/api/http/handler/endpoints)
- [Portainer source: `endpoint_create.go` (multipart/form-data, `EndpointCreationType`)](https://github.com/portainer/portainer/blob/develop/api/http/handler/endpoints/endpoint_create.go)
- [Portainer source: `endpoint_update.go` (`TeamAccessPolicies`, `UserAccessPolicies` payload fields)](https://github.com/portainer/portainer/blob/develop/api/http/handler/endpoints/endpoint_update.go)
- [Portainer source: `endpoint_settings_update.go` (PUT `/endpoints/{id}/settings`, `Allow*ForRegularUsers` flags)](https://github.com/portainer/portainer/blob/develop/api/http/handler/endpoints/endpoint_settings_update.go)
- [Portainer Roles documentation](https://docs.portainer.io/admin/user/roles)
- Cross-checked against sibling validated posts in this blog: `2026-03-20-manage-teams-roles-portainer-api`, `2026-03-20-portainer-per-environment-access-control`, `2026-03-20-portainer-multi-tenant-setup`.

## Issues Found

1. **Step 2 - Wrong endpoint for adding a user to a team.**
   The original used `PUT /api/teams/1/memberships` with body `{"Role": 1}`. That route only supports `GET` (list memberships); the body also omits the required `UserID` and `TeamID`. Replaced with `POST /api/team_memberships` and body `{"TeamID": 1, "UserID": 2, "Role": 1}` per the `teammembershipCreate` handler.

2. **Step 3 - Endpoint creation used JSON instead of multipart/form-data.**
   `POST /api/endpoints` is annotated `@accept multipart/form-data` and reads `EndpointCreationType` from form values. Switched the curl call from `-d '{...}'` JSON to `--form` fields. Also corrected `EndpointCreationType` from `1` (Local Docker) to `2` (Agent), since port 9001 is the Portainer Agent default and a TCP URL on that port without an agent type would not work. Removed the `tcp://` prefix from `URL` because Portainer expects a `host:port` form for agent endpoints.

3. **Step 4 - Endpoint and field names did not exist.**
   The original used `PUT /api/endpoints/{id}/access` with `AuthorizedTeams` / `AuthorizedUsers` arrays. There is no `/access` subroute (see `endpoints/handler.go`); access policies are set via `PUT /api/endpoints/{id}` with `TeamAccessPolicies` and `UserAccessPolicies` map payloads (see `endpoint_update.go`). Removed the non-existent fields and corrected the path. Also replaced the hardcoded `RoleId: 1=Endpoint Administrator, 2=Operator, 3=Helpdesk, ...` mapping (which is order-incorrect and instance-dependent) with a note instructing readers to query `GET /api/roles` for the IDs in their installation. This matches the pattern used in the validated `portainer-per-environment-access-control` post.

4. **Step 6 - Wrong endpoint and wrong payload shape for security settings.**
   The original sent `PUT /api/endpoints/{id}` with a nested `SecuritySettings` object whose fields used a lowercase first letter. The dedicated handler for these flags is `PUT /api/endpoints/{id}/settings` (`endpoint_settings_update.go`), and its payload (`endpointSettingsUpdatePayload`) takes the flags at the top level with PascalCase keys (`AllowBindMountsForRegularUsers`, etc.). Updated path, removed the `SecuritySettings` wrapper, and capitalized the field names.

5. **Step 6 title and intro called these flags "Resource Quotas".**
   The flags shown are Docker container security restrictions, not Portainer's resource quotas (which are a Kubernetes namespace feature). Renamed Step 6 to "Restrict What Regular Users Can Do per Environment" and adjusted the introduction/description to say "security policies" / "Docker security restrictions" so the framing matches the actual content. Also removed the "(Business Edition)" qualifier from Step 6: the `endpoint_settings_update.go` handler is part of Portainer CE, so these flags work in both editions.

## Review Notes
- The post still uses `Authorization: Bearer $ADMIN_TOKEN` even though the variable is named `admin_api_token`. Portainer accepts JWTs (from `POST /api/auth`) via `Authorization: Bearer`, but pure access tokens generated from a user's account settings should be sent as `X-API-Key`. Left as-is to stay consistent with sibling validated posts in this blog (e.g. `manage-teams-roles-portainer-api`, `portainer-per-environment-access-control`), which all use the Bearer form. Readers using API tokens (not JWTs) should swap to `X-API-Key`.
- Compose `version: "3.8"` keys are still accepted by Docker but have been deprecated/ignored by recent Docker Compose versions. Not corrected here because the file is still functional and removing the key is a stylistic change beyond the scope of technical fixes.
- The post asserts that Compose-level `subnet:` declarations alone provide tenant isolation on a shared host. They make addressing predictable but do not by themselves prevent inter-network traffic on a single Docker host (containers on different bridge networks can still reach each other's published ports, and a privileged container or host-network user can bypass it entirely). The post mitigates this by also disabling host namespaces / privileged mode in Step 6, so the overall guidance is sound, but readers seeking strong isolation on a shared host should also consider firewalling between bridges.
- Tag list says "Enterprise" but Portainer's commercial tier is "Business Edition" (sometimes "BE"). Kept as-is — matches the casual usage in other posts in the series and is not strictly wrong.
