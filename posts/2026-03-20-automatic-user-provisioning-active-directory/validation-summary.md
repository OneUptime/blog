# Validation Summary: How to Set Up Automatic User Provisioning with Active Directory in Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer Business Edition
- Microsoft Active Directory
- LDAP
- Portainer HTTP API
- `curl`
- Python 3

## Sources Consulted
- Portainer Active Directory authentication docs: https://docs.portainer.io/admin/settings/authentication/active-directory
- Portainer LDAP authentication docs: https://docs.portainer.io/admin/settings/authentication/ldap
- Portainer API docs index: https://docs.portainer.io/api/docs
- Portainer authentication handler source: https://github.com/portainer/portainer/blob/develop/api/http/handler/auth/authenticate.go
- Portainer LDAP settings and auth model source: https://github.com/portainer/portainer/blob/develop/api/portainer.go
- Portainer settings update handler source: https://github.com/portainer/portainer/blob/develop/api/http/handler/settings/settings_update.go
- Portainer LDAP service source: https://github.com/portainer/portainer/blob/develop/api/ldap/ldap.go
- Portainer user list and membership endpoints: https://github.com/portainer/portainer/blob/develop/api/http/handler/users/user_list.go and https://github.com/portainer/portainer/blob/develop/api/http/handler/users/user_memberships.go
- Portainer user deletion and request authorization behavior: https://github.com/portainer/portainer/blob/develop/api/http/handler/users/user_delete.go and https://github.com/portainer/portainer/blob/develop/api/http/security/bouncer.go

## Issues Found
- The post implied the workflow applied to all Portainer editions. Portainer documents Active Directory authentication under Portainer Business Edition, so the description and opening paragraph were corrected to name Business Edition explicitly.
- The `PUT /api/settings` example used `LDAPSettings.URLs` with an `ldaps://` URL array. Portainer's current settings API persists a single `LDAPSettings.URL` host-and-port string, so the example was corrected to use `"URL": "dc01.corp.example.com:636"`.
- The `GroupSearchSettings` example used unsupported fields and values. `UserAttribute` is not part of the current API model, and `GroupAttribute` should be the membership attribute such as `member`, so the payload was corrected.
- The flowchart said existing users "Sync group memberships". Portainer's login path adds matching team memberships based on LDAP/AD groups; it does not describe a full bidirectional sync in the official docs or current handler, so the wording was narrowed.
- The "Control Which AD Users Can Auto-Provision" example sent only a partial `LDAPSettings` object. Portainer replaces the nested LDAP settings object on update, so the example was corrected to resubmit the full LDAP settings block.
- The same section said it was restricting by AD group, but the original example actually restricted by OU. The filter was corrected to use `memberOf=CN=Portainer Users,...` so it matches the text.
- The `/api/users` example tried to print `TeamIDs`, but the current user-list response only exposes `Id`, `Username`, and `Role`. The example was corrected to print fields that the API actually returns.
- The deprovisioning text said Portainer "checks" AD in a way that implied background validation. The wording was corrected to state that the next login attempt fails, which matches Portainer's documented and implemented auth flow.

## Review Notes
- Team assignment depends on LDAP/AD group names matching existing Portainer team names; Portainer does not support arbitrary group-to-team mapping in the examples reviewed.
- The raw API examples were validated against Portainer's current documented API and source-backed server-side field names. The UI documentation mentions adding additional AD controllers, but the direct `PUT /api/settings` examples in this post were corrected to the server-side `LDAPSettings.URL` shape used by the current settings API.
