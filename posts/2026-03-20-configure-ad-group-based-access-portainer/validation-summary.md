# Validation Summary: How to Configure AD Group-Based Access in Portainer

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- Portainer Business Edition
- Microsoft Active Directory
- LDAP / LDAPS
- Portainer HTTP API
- PowerShell ActiveDirectory module
- Bash, curl, and Python 3

## Sources Consulted
- Portainer LDAP authentication documentation: https://docs.portainer.io/admin/settings/authentication/ldap
- Portainer Active Directory authentication documentation: https://docs.portainer.io/2.33-lts/admin/settings/authentication/active-directory
- Portainer roles documentation: https://docs.portainer.io/admin/user/roles
- Portainer API documentation: https://docs.portainer.io/api/docs
- Portainer API usage examples: https://docs.portainer.io/sts/api/examples
- Portainer troubleshooting FAQ on LDAP team auto-population: https://docs.portainer.io/faqs/troubleshooting/access-and-authentication/ldap-groups-are-not-auto-populating-portainer-teams
- Portainer source: `api/portainer.go`, `api/ldap/ldap.go`, `api/http/handler/settings/settings_update.go`, `api/http/handler/auth/authenticate.go`, `api/http/handler/teams/team_create.go`, `app/portainer/views/settings/authentication/settingsAuthenticationController.js`, `app/portainer/settings/authentication/ldap/ldap-settings.model.js` in https://github.com/portainer/portainer
- Microsoft Learn `New-ADGroup`: https://learn.microsoft.com/en-us/powershell/module/activedirectory/new-adgroup?view=windowsserver2025-ps
- Microsoft Learn `Add-ADGroupMember`: https://learn.microsoft.com/en-us/powershell/module/activedirectory/add-adgroupmember?view=windowsserver2025-ps

## Issues Found
1. **Incorrect assumption about AD-group-to-team mapping.** The post implied Portainer could sync users from an AD group into an arbitrarily named Portainer team. Portainer’s LDAP/AD team sync matches external group names to identically named Portainer teams. I updated the access model and team-creation loop to use matching names.
2. **Incorrect `/api/settings` LDAP payload fields.** The original example used `URLs` with an `ldaps://` URI. Portainer’s settings API uses a single `URL` field and expects `host:port`. I updated the payload to use `URL`, removed the URI scheme, and added `AnonymousMode` and `StartTLS` fields for clarity.
3. **Reversed / unsupported group-sync attributes.** The original `GroupSearchSettings` used `UserAttribute: "member"` and `GroupAttribute: "cn"`. Portainer uses `GroupAttribute` as the membership attribute and reads group names from `cn` internally. I removed the unsupported `UserAttribute` field and changed `GroupAttribute` to `member`.
4. **Imprecise Portainer role names.** The design table used `Admin`, `Standard`, and `Read`, which do not match Portainer’s documented role names for environment access. I updated them to `Environment administrator`, `Standard User`, and `Helpdesk`.
5. **Incorrect sync timing language.** The post said to assign access after users were “synced”. In Portainer, auto-provisioning and team membership sync happen when the user successfully authenticates. I changed the wording to say users should log in through AD at least once.
6. **Overly restrictive AD cmdlet guidance.** The note said to run the AD commands on a domain controller. The cmdlets can run from any PowerShell session with the ActiveDirectory module and sufficient permissions. I corrected the note.
7. **Missing Business Edition qualifier.** Portainer’s RBAC roles are a Business Edition feature. I added that qualifier in the introduction.

## Review Notes
- Portainer’s backend treats authentication method `2` as LDAP/AD, so using `LDAPSettings` for Active Directory is correct as long as the payload fields match the API schema.
- The `/api/auth`, `/api/teams`, and `/api/endpoints` examples are consistent with Portainer’s current API handlers and published examples.
- If the goal is to grant global Portainer administrators rather than environment-level administrators, Portainer provides a separate “Assign admin rights to group(s)” capability in the authentication settings UI. This post now accurately reflects team-based environment access rather than global admin assignment.
