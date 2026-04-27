# Validation Summary: How to Set Up Per-Group Access Control in Portainer

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Portainer (Community Edition)
- Portainer HTTP API (`/api/auth`, `/api/endpoints/{id}`)
- Role-Based Access Control (RBAC) — `TeamAccessPolicies`, `UserAccessPolicies`
- Bash + curl + python3 (for token extraction)

## Sources Consulted
- Portainer Roles documentation: https://docs.portainer.io/admin/user/roles
- Portainer "Manage access to environments" docs: https://docs.portainer.io/admin/environments/access
- Portainer source code — auth response struct (`api/http/handler/auth/authenticate.go`) confirming the auth endpoint returns `{"jwt": "..."}`: https://github.com/portainer/portainer/blob/develop/api/http/handler/auth/authenticate.go
- Portainer source code — `AccessPolicy`, `TeamAccessPolicies`, `UserAccessPolicies` definitions in `api/portainer.go`: https://github.com/portainer/portainer/blob/develop/api/portainer.go
- Portainer source code — default role IDs assigned in DB migration `api/datastore/migrator/migrate_dbversion20.go` (definitive mapping for CE default roles): https://github.com/portainer/portainer/blob/develop/api/datastore/migrator/migrate_dbversion20.go
- Portainer source code — role authorization helpers (`DefaultEndpointAuthorizationsForEndpointAdministratorRole`, `...HelpDeskRole`, `...StandardUserRole`, `...ReadOnlyUserRole`) in `api/internal/authorization/authorizations.go`: https://github.com/portainer/portainer/blob/develop/api/internal/authorization/authorizations.go

## Issues Found
- **Role Reference table had incorrect Role IDs.** The post listed five roles with IDs 1–5 (Environment Admin, Operator, Helpdesk, Standard User, Read-Only). Per the authoritative Portainer source code (`migrate_dbversion20.go`), Portainer CE ships with four default roles whose IDs are: 1 = Endpoint/Environment Administrator, 2 = HelpDesk, 3 = Standard User, 4 = Read-Only User. "Operator" is not part of the default CE role set, and the IDs assigned to Helpdesk, Standard User, and Read-Only in the post were all off-by-one (or more) due to inserting Operator at ID 2. I corrected the table to the four CE default roles with their actual IDs and folded "Operations team" into Standard User's typical-use column so the original guidance for ops users wasn't lost.

## Review Notes
- The auth flow (`POST /api/auth` with `{"username","password"}` returning `{"jwt": "..."}`) is correct against the current source.
- Reading endpoint access via `GET /api/endpoints/{id}` and inspecting `TeamAccessPolicies` / `UserAccessPolicies` is correct — these are the canonical fields on the `Endpoint` struct, with `AccessPolicy.RoleID` referencing the role.
- The intro contains an awkward duplication ("how to configure How to Set Up Per-Group Access Control in Portainer in Portainer"). Left as-is per instructions to avoid stylistic changes; worth cleaning up in a future editorial pass.
- `--insecure` is fine for a localhost dev server with a self-signed cert but should not be promoted for production usage; the post does not claim otherwise.
- Operator and Namespace Operator are Business Edition / newer-version roles. If a future revision wants to cover them, the IDs need to be verified per the user's specific Portainer deployment (the CE migration only seeds IDs 1–4).
