# Validation Summary: How to Configure Standard User Permissions in Portainer

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Portainer (Community / Business Edition RBAC)
- Portainer HTTP API (`/api/auth`, `/api/users`, `/api/endpoints/{id}/useraccesspolicies`)
- curl
- Bash / Python3 (for parsing the JWT response)

## Sources Consulted
- Portainer source: `api/portainer.go` — `UserRole` constants (`AdministratorRole = 1`, `StandardUserRole = 2`): https://github.com/portainer/portainer/blob/develop/api/portainer.go
- Portainer source: `api/datastore/migrator/migrate_dbversion20.go` — confirms endpoint `RoleID` mapping: 1=EndpointAdministrator, 2=HelpDesk, 3=StandardUser, 4=ReadOnly: https://github.com/portainer/portainer/blob/develop/api/datastore/migrator/migrate_dbversion20.go
- Portainer Roles documentation: https://docs.portainer.io/admin/user/roles
- Portainer API access docs: https://docs.portainer.io/api/access
- Portainer Docker roles and permissions: https://docs.portainer.io/advanced/docker-roles-and-permissions

## Issues Found
1. **Incorrect endpoint `RoleID` for Standard User.** The original post used `RoleID: 4` for the per-environment Standard User role. Per Portainer's source (`migrate_dbversion20.go`), the endpoint role IDs are: 1=EndpointAdministrator, 2=HelpDesk, 3=StandardUser, 4=ReadOnlyUser. `RoleID: 4` is the Read-only role, not Standard User. Fixed to `RoleID: 3` (in two places — the "Grant Environment Access" and the "Restrict What Standard Users Can Do" examples). The accompanying comment "(role 4)" was updated to "(role 3)".
2. **Incorrect endpoint `RoleID` for Helpdesk.** The original post used `RoleID: 3` for the Helpdesk role on the production environment example. Helpdesk is `RoleID: 2`. Fixed to `RoleID: 2`.

## Review Notes
- The global `User.Role` value (`Role: 2` for Standard User on user creation) is correct and verified against `api/portainer.go` (`AdministratorRole = 1`, `StandardUserRole = 2`).
- The API endpoints used (`POST /api/auth`, `POST /api/users`, `PUT /api/endpoints/{id}/useraccesspolicies`) are accurate.
- Note that per-environment RBAC (the `useraccesspolicies` `RoleID` mechanism beyond the basic Standard User vs. Administrator distinction) is a Portainer Business Edition feature. Helpdesk, Standard User (per-environment), Read-only, and Operator roles are BE-only. This is a version/edition caveat the post does not call out, but the commands are technically correct for BE installations.
- The Operator role (`RoleID: 5`) exists in newer Portainer BE versions but is not referenced in this post, which is fine.
- The shell + Python pipeline in "Create a Standard User" works as written; quoting (double-quoted `python3 -c "..."` containing single-quoted `'jwt'`) is correct in bash.
