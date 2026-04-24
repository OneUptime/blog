# Validation Summary: How to Auto-Populate Teams from LDAP Groups in Portainer - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer Business Edition
- LDAP / OpenLDAP
- Portainer HTTP API
- Portainer RBAC and team access policies
- LDIF

## Sources Consulted
- Portainer docs: Authenticate via LDAP - https://docs.portainer.io/sts/admin/settings/authentication/ldap
- Portainer API spec (Business Edition 2.39.1) - https://api-docs.portainer.io/versions/ee/2.39.1.yaml
- Portainer source: LDAP authentication and team sync logic - https://github.com/portainer/portainer/blob/develop/api/http/handler/auth/authenticate.go
- Portainer source: settings update handler - https://github.com/portainer/portainer/blob/develop/api/http/handler/settings/settings_update.go
- Portainer source: environment update handler - https://github.com/portainer/portainer/blob/develop/api/http/handler/endpoints/endpoint_update.go
- Portainer source: LDAP settings model - https://github.com/portainer/portainer/blob/develop/app/portainer/settings/authentication/ldap/ldap-settings.model.js
- Portainer source: RBAC role IDs - https://github.com/portainer/portainer/blob/develop/app/portainer/rbac/models/role.js
- Portainer source: RBAC role names - https://github.com/portainer/portainer/blob/develop/app/portainer/rbac/services/role.service.js

## Issues Found
- The post said Portainer creates teams automatically from LDAP groups. I corrected this to the documented behavior: Portainer synchronizes users into existing identically named Portainer teams.
- The post claimed Portainer provides full lifecycle team management and eliminates all manual team management. I corrected this to note that teams must still exist in Portainer and still need environment access assigned.
- The Step 2 instructions described a separate automatic team-membership toggle. I replaced this with the documented flow: configure LDAP group search, save the settings, and ensure the Portainer team names match the LDAP group names.
- The `/api/settings` example used the wrong payload shape and field names (`ldapsettings`, `Servers`, `Username`). I corrected it to the current schema (`LDAPSettings`, `URLs`, `ServerType`, `UserNameAttribute`, and the current LDAP settings object structure).
- The environment access example used an invalid endpoint path (`PUT /api/endpoints/{id}/teamaccesspolicies`). I replaced it with the current environment update flow using `GET/PUT /api/endpoints/{id}` and `TeamAccessPolicies`, while preserving existing team access policies.
- The admin-mapping section used an undocumented `Admin Group` text field. I corrected it to the documented admin group workflow: configure the admin group search, click `Fetch Admin Group(s)`, select the group, and enable `Assign admin rights to group(s)`.
- The walkthrough said Alice's login creates the `devops` team. I corrected this to adding Alice to an existing `devops` team.

## Review Notes
- The API example uses `ServerType: 1`, which matches the current OpenLDAP profile in Portainer. If the target setup is Active Directory or a custom LDAP profile, that value should be adjusted.
- The access-policy example now resolves both `TEAM_ID` and `ROLE_ID` dynamically through the API instead of hardcoding them, which makes the example less brittle across Portainer versions and environments.
