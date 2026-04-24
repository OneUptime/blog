# Validation Summary: How to Set Up Auto-Admin Assignment for OAuth Groups in Portainer (2)

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer Business Edition
- OAuth 2.0 / OpenID Connect
- Microsoft Entra ID
- Keycloak
- Authentik
- Portainer HTTP API
- PowerShell
- Bash

## Sources Consulted
- Portainer OAuth authentication docs: https://docs.portainer.io/sts/admin/settings/authentication/oauth
- Portainer API docs index: https://docs.portainer.io/api/docs
- Portainer BE API schema 2.39.1: https://api-docs.portainer.io/versions/ee/2.39.1.yaml
- Portainer source code for OAuth claim handling: https://github.com/portainer/portainer/blob/develop/api/oauth/oauth.go
- Portainer source code for OAuth/team membership UI: https://github.com/portainer/portainer/blob/develop/app/portainer/oauth/components/oauth-settings/oauth-settings.html
- Microsoft Entra group claims docs: https://learn.microsoft.com/en-us/entra/identity/hybrid/connect/how-to-connect-fed-group-claims
- Microsoft Entra PowerShell `New-EntraGroup`: https://learn.microsoft.com/en-us/powershell/module/microsoft.entra/new-entragroup?view=entra-powershell
- Microsoft Entra PowerShell `Add-EntraGroupMember`: https://learn.microsoft.com/en-us/powershell/module/microsoft.entra/add-entragroupmember?view=entra-powershell
- Microsoft Entra PowerShell retirement notice for AzureAD/MSOnline modules: https://learn.microsoft.com/en-us/entra/fundamentals/whats-new-archive
- Keycloak Admin REST API groups endpoint: https://www.keycloak.org/docs-api/latest/rest-api/index.html
- Authentik group management docs: https://docs.goauthentik.io/users-sources/groups/manage_groups/

## Issues Found
- The Microsoft example used retired AzureAD PowerShell cmdlets (`New-AzureADGroup`, `Add-AzureADGroupMember`). I replaced them with current Microsoft Entra PowerShell cmdlets and added the required `Connect-Entra` step.
- The prerequisites incorrectly said a Portainer team with the admin group name had to exist. Auto-admin assignment uses group regex matching and does not require a matching Portainer team, so that prerequisite was corrected.
- The post said the admin group had to appear in token claims and used a `base64 -d` JWT decode example that is not reliable for JWT base64url payloads. I corrected the explanation to match Portainer’s actual behavior and replaced the decode snippet with a Python base64url-safe example.
- The Web UI instructions referenced an `Admin team/group claim` field that does not match the current Portainer docs flow. I updated the steps to the documented Automatic team membership and claim-based admin assignment flow.
- The API example used incorrect Portainer settings field names and structure (`oauthsettings`, `OAuthClaimMatchers`, `RoleId`, `TeamId`). I corrected the payload to the current BE schema using `OAuthSettings`, `OAuthAutoMapTeamMemberships`, `AdminAutoPopulate`, `AdminGroupClaimsRegexList`, and `OAuthClaimMappings`.
- The API example included a generic `groups` scope, which is not a standard requirement across providers. I removed it from the example and kept the scopes provider-neutral.
- The test section used `/api/auth` with a user password and treated `/api/users` as an admin-only endpoint. I replaced that with a correct `GET /api/users/me?noEndpointAuthorizations=true` role check using an existing Portainer bearer token, which matches the current API docs.
- The post did not make the Microsoft Entra ID group value format clear. I added the required note that Portainer expects the group Object ID by default for Entra unless the emitted claim format was changed.

## Review Notes
- Microsoft Entra ID can omit `groups` claims when a user belongs to many groups. The official Microsoft documentation notes token-size limits and overage behavior, so this is a practical caveat for large tenants.
- Portainer’s OAuth processing merges claims from the configured resource endpoint with claims from the `id_token`, which is why the revised post now refers to OAuth data available to Portainer rather than token claims only.
