# Validation Summary: How to Configure AD Group-Based Access in Portainer - A Practical Guide

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Portainer Business Edition
- Microsoft Active Directory
- LDAP/AD group search and team synchronization
- Portainer HTTP API
- PowerShell ActiveDirectory module
- Bash, `curl`, and `python3`

## Sources Consulted
- Portainer: Authenticate via Active Directory: https://docs.portainer.io/admin/settings/authentication/active-directory
- Portainer: Authenticate via LDAP: https://docs.portainer.io/sts/admin/settings/authentication/ldap
- Portainer FAQ: LDAP Groups are not auto-populating Portainer teams: https://docs.portainer.io/faqs/troubleshooting/access-and-authentication/ldap-groups-are-not-auto-populating-portainer-teams
- Portainer: API documentation: https://docs.portainer.io/api/docs
- Portainer: API usage examples: https://docs.portainer.io/sts/api/examples
- Portainer CE 2.39.1 OpenAPI spec: https://api-docs.portainer.io/?edition=ce&version=2.39.1
- Portainer source: `api/http/handler/endpoints/endpoint_update.go`: https://github.com/portainer/portainer/blob/develop/api/http/handler/endpoints/endpoint_update.go
- Portainer source: `api/ldap/ldap.go`: https://github.com/portainer/portainer/blob/develop/api/ldap/ldap.go
- Portainer source: `api/http/handler/auth/authenticate.go`: https://github.com/portainer/portainer/blob/develop/api/http/handler/auth/authenticate.go
- Microsoft Learn: `New-ADGroup`: https://learn.microsoft.com/en-us/powershell/module/activedirectory/new-adgroup?view=windowsserver2025-ps
- Microsoft Learn: `Add-ADGroupMember`: https://learn.microsoft.com/en-us/powershell/module/activedirectory/add-adgroupmember?view=windowsserver2025-ps

## Issues Found
- The post treated AD setup as Portainer's generic LDAP screen and configured `memberOf` as the group membership attribute. I updated Step 2 to Portainer's current Microsoft Active Directory flow and removed the incorrect `memberOf` guidance, because Portainer's current AD documentation derives group search settings from the AD search paths and selected groups instead.
- The post described the feature as applying to Portainer generally. I updated the description, introduction, and conclusion to specify `Portainer Business Edition`, because Portainer's official Active Directory and RBAC documentation is BE-specific.
- The API examples used payloads and an endpoint that do not match Portainer's current API documentation: `/api/auth` used lowercase keys, `/api/teams` used `name`, and environment team access was sent to `/api/endpoints/1/teamaccesspolicies`. I corrected the examples to use documented payload fields (`Username`, `Password`, `Name`) and the current environment update endpoint `/api/endpoints/{id}` with `TeamAccessPolicies` in the request body.
- The post hard-coded role IDs and described `Operator` as Kubernetes-only. I replaced that with a `/api/roles` lookup step and a variable placeholder so the guide uses the current role ID from the target Portainer instance instead of assuming fixed values.
- The nested AD group section recommended a recursive `memberOf:1.2.840.113556.1.4.1941` filter. I removed that and replaced it with direct-membership guidance, because Portainer's team-sync logic searches groups where the configured group membership attribute contains the user's distinguished name.

## Review Notes
- The direct-membership guidance for nested groups is based on Portainer's official source implementation in `api/ldap/ldap.go` together with Portainer's FAQ stating that team synchronization requires DN-based group membership.
- Automatic user provisioning remains optional, but it must be enabled if you want first-time AD users to be created in Portainer automatically on successful login.
- The PowerShell examples for `New-ADGroup` and `Add-ADGroupMember` are syntactically valid against current Microsoft Learn documentation.
