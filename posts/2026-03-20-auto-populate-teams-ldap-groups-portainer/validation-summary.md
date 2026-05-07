# Validation Summary: How to Auto-Populate Teams from LDAP Groups in Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer Business Edition
- LDAP
- Active Directory
- Portainer HTTP API
- Bash
- Python 3

## Sources Consulted
- Portainer documentation: LDAP authentication and group search configuration: https://docs.portainer.io/admin/settings/authentication/ldap
- Portainer documentation: Active Directory authentication and group search configuration: https://docs.portainer.io/2.33-lts/admin/settings/authentication/active-directory
- Portainer troubleshooting: LDAP groups not auto-populating Portainer teams: https://docs.portainer.io/faqs/troubleshooting/access-and-authentication/ldap-groups-are-not-auto-populating-portainer-teams
- Portainer source: LDAP settings and settings payload structs: https://github.com/portainer/portainer/blob/develop/api/portainer.go
- Portainer source: LDAP group lookup logic and `cn` team-name matching behavior: https://github.com/portainer/portainer/blob/develop/api/ldap/ldap.go
- Portainer source: settings update and LDAP authentication handlers: https://github.com/portainer/portainer/blob/develop/api/http/handler/settings/settings_update.go and https://github.com/portainer/portainer/blob/develop/api/http/handler/auth/authenticate.go
- Portainer source: team creation, team listing, team memberships, and user membership endpoints: https://github.com/portainer/portainer/blob/develop/api/http/handler/teams/team_create.go, https://github.com/portainer/portainer/blob/develop/api/http/handler/teams/team_list.go, https://github.com/portainer/portainer/blob/develop/api/http/handler/teammemberships/teammembership_list.go, and https://github.com/portainer/portainer/blob/develop/api/http/handler/users/user_memberships.go
- Portainer source: authentication UI behavior for LDAP settings: https://github.com/portainer/portainer/blob/develop/app/portainer/views/settings/authentication/settingsAuthenticationController.js

## Issues Found
- The description and intro implied Portainer auto-creates teams from LDAP groups. Portainer maps LDAP groups to existing identically named teams, so the wording was corrected to say it populates existing teams.
- The UI walkthrough referenced a separate "Auto-populate team membership" toggle and mislabeled the group settings fields. Portainer enables LDAP team sync through group-search configuration, and the correct field is `Group Membership Attribute` with `member`.
- The API example used incorrect LDAP settings fields and values. `LDAPSettings` in the current API uses `URL`, not `URLs`, expects `host:port` rather than an `ldaps://` URL, and `GroupSearchSettings` uses `GroupAttribute`, not `UserAttribute`.
- The API example incorrectly treated `cn` as a configurable group attribute field. Portainer derives team matches from each LDAP group's `cn`, so the incorrect `GroupAttribute: "cn"` usage was removed and the post now states that team names must match the group's `cn` value.
- The Active Directory section incorrectly recommended `memberOf` for team sync. Portainer's LDAP group lookup uses DN-based membership on the group object, so the example was corrected to use the group's `member` attribute.
- The verification section used endpoints and fields that do not expose team membership as written. `/api/teams` lists teams only, and `/api/users` does not return `TeamIDs`, so the commands were updated to use `/api/team_memberships` and `/api/users/{id}/memberships`.

## Review Notes
- Portainer's team matching for LDAP group sync is implicitly based on each group's `cn` value; there is no separate API field to configure the group-name attribute.
- Portainer's UI still exposes multiple LDAP server entries, but the direct settings API payload validated in source uses `LDAPSettings.URL`. API examples should use `URL`, not `URLs`.
