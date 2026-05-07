# Validation Summary: How to Set Up Auto-Admin Assignment for OAuth Groups in Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer Business Edition
- Portainer HTTP API
- OAuth / OpenID Connect
- Microsoft Entra ID (Azure AD)
- Microsoft Entra PowerShell
- Keycloak
- Bash
- PowerShell
- Python

## Sources Consulted
- Portainer OAuth authentication docs: https://docs.portainer.io/sts/admin/settings/authentication/oauth
- Portainer API documentation index: https://docs.portainer.io/api/docs
- Portainer BE settings API schema: https://api-docs.portainer.io/versions/ee/2.41.0/settings.yaml
- Portainer BE auth API schema: https://api-docs.portainer.io/versions/ee/2.39.2/auth.yaml
- Portainer BE users API schema: https://api-docs.portainer.io/versions/ee/2.39.2/users.yaml
- Portainer FAQ on internal vs external auth: https://docs.portainer.io/sts/faqs/installing/can-i-use-internal-authentication-and-external-authentication-at-the-same-time
- Microsoft Entra PowerShell group management docs: https://learn.microsoft.com/en-us/powershell/entra-powershell/manage-groups?view=entra-powershell
- Add-EntraGroupMember cmdlet docs: https://learn.microsoft.com/en-us/powershell/module/microsoft.entra.groups/add-entragroupmember?view=entra-powershell
- Microsoft Entra release archive with AzureAD/MSOnline retirement notice: https://learn.microsoft.com/en-us/entra/fundamentals/whats-new-archive
- Keycloak GroupMembershipMapper API docs: https://www.keycloak.org/docs-api/latest/javadocs/org/keycloak/protocol/oidc/mappers/GroupMembershipMapper.html
- Keycloak Server Administration Guide: https://www.keycloak.org/docs/latest/server_admin/

## Issues Found
- The Portainer API payload used outdated OAuth settings fields: `OAuthTeamMemberships`, `TeamMembershipClaim`, and `AdminGroupName`. I replaced them with the current schema: `OAuthAutoMapTeamMemberships` and `TeamMemberships` with `OAuthClaimName`, `AdminAutoPopulate`, and `AdminGroupClaimsRegexList`, based on the current Portainer BE API schema.
- The explanation of admin auto-assignment described simple group-name matching. Current Portainer documentation and API behavior are claim-based and use regex matching for admin-group selection, so I updated the wording to reflect claim-value regex matching.
- The Azure example used retired `AzureAD` PowerShell cmdlets (`New-AzureADGroup` and `Add-AzureADGroupMember`). I replaced them with current Microsoft Entra PowerShell commands (`Connect-Entra`, `New-EntraGroup`, `Get-EntraUser`, and `Add-EntraGroupMember`).
- The Microsoft Entra example implied that Portainer should match on the group display name. Portainer’s OAuth docs explicitly require using the group Object ID for Microsoft Entra ID claim-value regex matching, so I added that correction.
- The Keycloak instructions were too loose about the emitted group claim. I corrected them to reference a Group Membership mapper returning a `groups` claim, and noted that full group paths may need to be matched explicitly or via regex.
- The test `userinfo` URL did not match the configured `ResourceURI` in the earlier sample. I aligned the test command with the same `/oauth/userinfo` endpoint used in the configuration snippet.
- The fallback account guidance said to keep a local admin account active. Portainer documents that only the initial admin account remains usable for internal auth when external auth is enabled, so I corrected that note.

## Review Notes
- The sample still uses a generic custom OAuth configuration, so `Scopes` and `RedirectURI` remain provider- and deployment-specific. They must match the chosen IdP configuration and the public Portainer URL exactly.
