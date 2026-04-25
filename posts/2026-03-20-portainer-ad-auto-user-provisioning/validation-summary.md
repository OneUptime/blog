# Validation Summary: How to Set Up Automatic User Provisioning with Active Directory in Portainer (2)

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Portainer Business Edition
- Microsoft Active Directory
- LDAP / AD-backed authentication
- Portainer HTTP API
- Shell scripting with `curl`
- Python 3 JSON parsing in shell pipelines

## Sources Consulted
- Portainer docs: Authenticate via Active Directory - https://docs.portainer.io/admin/settings/authentication/active-directory
- Portainer docs: API documentation - https://docs.portainer.io/api/docs
- Portainer docs: Accessing the Portainer API - https://docs.portainer.io/api/access
- Portainer docs: LDAP Groups are not auto-populating Portainer teams - https://docs.portainer.io/faqs/troubleshooting/access-and-authentication/ldap-groups-are-not-auto-populating-portainer-teams
- Portainer source: `api/portainer.go` - https://github.com/portainer/portainer/blob/develop/api/portainer.go
- Portainer source: `api/http/handler/settings/settings_update.go` - https://github.com/portainer/portainer/blob/develop/api/http/handler/settings/settings_update.go
- Portainer source: `api/http/handler/auth/authenticate.go` - https://github.com/portainer/portainer/blob/develop/api/http/handler/auth/authenticate.go
- Portainer source: `api/ldap/ldap.go` - https://github.com/portainer/portainer/blob/develop/api/ldap/ldap.go
- Portainer source: `api/http/handler/endpoints/endpoint_update.go` - https://github.com/portainer/portainer/blob/develop/api/http/handler/endpoints/endpoint_update.go
- Portainer source: `api/http/security/bouncer.go` - https://github.com/portainer/portainer/blob/develop/api/http/security/bouncer.go
- Portainer source: `api/datastore/migrator/migrate_dbversion20.go` - https://github.com/portainer/portainer/blob/develop/api/datastore/migrator/migrate_dbversion20.go

## Issues Found
- The post described the UI path as `Settings → Authentication → LDAP`, but current Portainer documents Active Directory setup under `Settings → Authentication → Microsoft Active Directory`. I corrected the UI path and added the Portainer Business Edition requirement because AD auth is documented as a BE feature.
- The API settings payload was not compatible with Portainer's current settings model. I replaced the invalid `ldapsettings` / `Servers` / `Username` structure with the documented `LDAPSettings` object and the actual backend field names such as `URL`, `UserNameAttribute`, `TLSConfig`, and `AutoCreateUsers`.
- The group sync example used `GroupAttribute: memberOf`, which does not match Portainer's LDAP/AD group lookup logic. Portainer searches group entries using the user's DN against the configured group membership attribute, so I changed this to `member`, which also matches Portainer's docs and troubleshooting guidance for team auto-assignment.
- The post claimed you can optionally choose a default team for new LDAP/AD users. Current Portainer docs and source expose a default team for OAuth auto-provisioning, not for LDAP/AD auto-provisioning. I removed that incorrect instruction.
- The team creation example posted lowercase `name`. While Go's JSON decoding is permissive, Portainer's team-create payload is documented with `Name`, so I updated the example to match the current API contract.
- The environment-access example used an outdated/incorrect `PUT /api/endpoints/{id}/teamaccesspolicies` route and inconsistent role IDs. I replaced it with the current `PUT /api/endpoints/{id}` payload using `TeamAccessPolicies`, and set `RoleId: 1` for the verified default `Endpoint administrator` role.
- The post overstated team synchronization by saying group membership is re-synchronized on every login. Current Portainer auth code adds newly matched team memberships on login, but does not remove stale ones. I corrected the workflow description, lifecycle table, and deprovisioning section to reflect that additive behavior.
- The admin-role section implied a single free-form `Admin group` DN field. Current Portainer docs describe this as the `Auto-populate team admins` flow using group search settings plus `Fetch Admin Group(s)` and `Assign admin rights to group(s)`. I rewrote that section to match the documented workflow.

## Review Notes
- Portainer's current docs recommend API access tokens via `X-API-Key` for general API usage, but the corrected post's `/api/auth` plus `Authorization: Bearer <jwt>` examples remain technically valid according to the current backend auth handlers.
- Team-to-group mapping in Portainer is based on matching AD group names to identically named Portainer teams. Team assignment is additive on login, so organizations that need strict deprovisioning should keep manual or scripted cleanup in place.
