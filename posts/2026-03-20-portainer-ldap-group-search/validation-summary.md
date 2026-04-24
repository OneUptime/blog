# Validation Summary: How to Configure LDAP Group Search in Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- LDAP
- OpenLDAP
- Microsoft Active Directory
- Portainer API
- OpenLDAP `ldapsearch`

## Sources Consulted
- Portainer LDAP authentication docs: https://docs.portainer.io/admin/settings/authentication/ldap
- Portainer Active Directory authentication docs: https://docs.portainer.io/admin/settings/authentication/active-directory
- Portainer FAQ, LDAP groups not auto-populating teams: https://docs.portainer.io/faqs/troubleshooting/access-and-authentication/ldap-groups-are-not-auto-populating-portainer-teams
- Portainer API docs landing page: https://docs.portainer.io/api/docs
- Portainer source, LDAP/API settings structs: https://github.com/portainer/portainer/blob/develop/api/portainer.go
- Portainer source, LDAP group lookup implementation: https://github.com/portainer/portainer/blob/develop/api/ldap/ldap.go
- Portainer source, `/api/settings` update payload: https://github.com/portainer/portainer/blob/develop/api/http/handler/settings/settings_update.go
- Portainer source, LDAP team sync and case-insensitive team-name matching: https://github.com/portainer/portainer/blob/develop/api/http/handler/auth/authenticate.go
- Portainer source, AD group filter generation in the UI: https://github.com/portainer/portainer/blob/develop/app/portainer/settings/authentication/ldap/ldap-group-search-item/ldap-group-search-item.controller.js
- OpenLDAP `ldapsearch` CLI help verified locally (`ldapsearch` 2.6.7) for `-x`, `-H`, `-D`, `-w`, and `-b`

## Issues Found
- The post said Portainer handles both `groupOfNames/member` and `posixGroup/memberUid` for automatic team assignment. I corrected this to reflect Portainer's official FAQ and current LDAP lookup behavior: `posixGroup/memberUid` can display group matches, but automatic team sync requires DN-based membership such as `groupOfNames/member`.
- The Active Directory UI guidance incorrectly treated AD like the generic LDAP screen and recommended `memberOf` for team sync. I corrected the UI path to Portainer's `Microsoft Active Directory` auth screen, updated the example to use the AD group-search fields Portainer actually exposes, and clarified that `memberOf` is useful for inspection but is not the membership attribute Portainer uses for team sync.
- The API example used an incorrect payload shape and field names (`ldapsettings`, `Servers`, `Username`). I replaced it with the current Portainer settings payload shape using `LDAPSettings`, `AnonymousMode`, `URL`, `TLSConfig`, `SearchSettings[].UserNameAttribute`, and `GroupSearchSettings[].GroupAttribute`.
- The post claimed Portainer team names must match LDAP group `cn` values exactly, including case. I corrected this because Portainer's team-sync code compares names case-insensitively.
- The post claimed Portainer Business Edition can automatically create Portainer teams from LDAP groups. I corrected this to match current behavior: Portainer syncs users into existing teams, but teams still need to be created in Portainer first.

## Review Notes
- The `ldapsearch` examples are syntactically correct. For production use, consider `-W` or `-y` instead of `-w` to avoid placing passwords directly on the command line.
