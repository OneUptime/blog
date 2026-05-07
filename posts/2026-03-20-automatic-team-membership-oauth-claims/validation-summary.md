# Validation Summary: How to Configure Automatic Team Membership via OAuth Claims in Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer Business Edition
- OAuth 2.0 / OpenID Connect
- Microsoft Entra ID (Azure AD)
- Keycloak
- authentik
- Bash
- Portainer HTTP API

## Sources Consulted
- Portainer OAuth authentication docs: https://docs.portainer.io/admin/settings/authentication/oauth
- Portainer API docs index: https://docs.portainer.io/api/docs
- Portainer official source for OAuth team membership UI: https://github.com/portainer/portainer/blob/develop/app/portainer/oauth/components/oauth-settings/oauth-settings.html
- Portainer official source for OAuth settings controller: https://github.com/portainer/portainer/blob/develop/app/portainer/oauth/components/oauth-settings/oauth-settings.controller.js
- Portainer official source for authentication settings validation: https://github.com/portainer/portainer/blob/develop/app/portainer/views/settings/authentication/settingsAuthenticationController.js
- Portainer official source for user list endpoint: https://github.com/portainer/portainer/blob/develop/api/http/handler/users/user_list.go
- Portainer official source for user memberships endpoint: https://github.com/portainer/portainer/blob/develop/api/http/handler/users/user_memberships.go
- Microsoft Learn on group claims and group IDs in tokens: https://learn.microsoft.com/en-us/security/zero-trust/develop/configure-tokens-group-claims-app-roles
- Keycloak GroupMembershipMapper docs: https://www.keycloak.org/docs-api/latest/javadocs/org/keycloak/protocol/oidc/mappers/GroupMembershipMapper.html
- authentik OAuth 2.0 provider docs: https://docs.goauthentik.io/add-secure-apps/providers/oauth2/
- authentik property mappings docs: https://docs.goauthentik.io/add-secure-apps/providers/property-mappings/

## Issues Found
- The Microsoft Entra ID section incorrectly told readers to use group display names. Portainer’s OAuth docs specifically note that Entra ID automatic team membership should use the group Object ID value for claim value regex matching, so this was corrected.
- The authentik section incorrectly referred to a `groups` scope. authentik’s official OAuth provider docs state that the default `profile` scope includes group membership, so this was corrected.
- The Portainer API example used outdated/incorrect automatic-team-membership fields (`OAuthTeamMemberships` and `TeamMembershipClaim`). These were replaced with the current Portainer UI/source-backed shape using `OAuthAutoMapTeamMemberships` and `TeamMemberships.OAuthClaimName`.
- The example scopes string implied a universal `groups` scope. This is not portable across the providers discussed, so the example was corrected to `openid profile email` and clarified as provider-specific.
- The verification example attempted to read `TeamIDs` from `/api/users`, but Portainer’s user list endpoint does not return team memberships. The example was corrected to use `/api/users/<user-id>/memberships`.
- The explanation of the login flow referred only to a `userinfo` endpoint. Portainer actually uses the configured Resource URL to retrieve user information, so the wording was corrected to reflect that.
- The team creation section implied exact name matching as the only mode. Portainer also supports regex-based static mappings, so the text was corrected to distinguish direct name matching from ID/path-based mappings.

## Review Notes
- Portainer’s public documentation covers the OAuth team-membership feature, but the exact Business Edition API payload fields for automatic team membership are not clearly described in the public OpenAPI pages. The payload correction was cross-checked against Portainer’s official UI source.
- Microsoft Entra group claims can be omitted when a user belongs to too many groups. Microsoft documents token group overage limits, so large tenants may need additional handling outside the scope of this post.
