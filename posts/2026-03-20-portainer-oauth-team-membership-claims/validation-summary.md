# Validation Summary: How to Configure Automatic Team Membership via OAuth Claims in Portainer (2)

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Portainer Business Edition
- OAuth 2.0 / OpenID Connect
- Microsoft Entra ID
- Keycloak
- Authelia
- authentik
- Portainer HTTP API
- Bash
- Python 3

## Sources Consulted
- Portainer OAuth authentication docs: https://docs.portainer.io/admin/settings/authentication/oauth
- Portainer API docs index: https://docs.portainer.io/api/docs
- Portainer BE 2.39.1 API spec: https://api-docs.portainer.io/?edition=ee&version=2.39.1
- Portainer source: OAuth claim/resource handling: https://github.com/portainer/portainer/blob/develop/api/oauth/oauth.go
- Portainer source: OAuth team-membership UI text and claim tooltip: https://github.com/portainer/portainer/blob/develop/app/portainer/oauth/components/oauth-settings/oauth-settings.html
- Portainer roles docs: https://docs.portainer.io/admin/user/roles
- Microsoft Entra group claims docs: https://learn.microsoft.com/en-us/entra/identity/hybrid/connect/how-to-connect-fed-group-claims
- Keycloak Server Administration Guide: https://www.keycloak.org/docs/latest/server_admin/
- Keycloak GroupMembershipMapper API docs: https://www.keycloak.org/docs-api/latest/javadocs/org/keycloak/protocol/oidc/mappers/GroupMembershipMapper.html
- Authelia OpenID Connect provider docs: https://www.authelia.com/configuration/identity-providers/openid-connect/provider/
- Authelia OpenID Connect client docs: https://www.authelia.com/configuration/identity-providers/openid-connect/clients/
- authentik provider property mappings docs: https://docs.goauthentik.io/add-secure-apps/providers/property-mappings/
- authentik OAuth2 provider docs: https://docs.goauthentik.io/add-secure-apps/providers/oauth2/
- authentik Portainer integration guide: https://integrations.goauthentik.io/hypervisors-orchestrators/portainer/

## Issues Found
- The post described Portainer as reading team-mapping data from “OAuth tokens” only. Portainer’s current custom OAuth flow fetches the configured `Resource URL` and merges claims from the `id_token` when present. I corrected the wording to refer to OAuth/OIDC claims more generally and updated the verification section to mention the OIDC userinfo response.
- The Microsoft Entra section implied group display names could be emitted generally instead of IDs. Current Microsoft docs limit cloud-only display names to groups assigned to the application, and Portainer’s Microsoft provider docs explicitly recommend using the group Object ID in claim-value regex mappings. I corrected the Entra instructions and replaced the sample payload with Object IDs.
- The Authelia snippet used `id` instead of the current `client_id` field name for OIDC clients. I corrected the configuration example and clarified the `groups` scope note.
- The JWT inspection command used plain `base64 -d`, which is not robust for JWT base64url encoding. I replaced it with a Python 3 example that correctly decodes base64url payloads.
- The Portainer UI text in Step 3 did not match current wording. I updated it to the current “Automatic team membership” and “Claim name” fields.
- The environment-access API example used an outdated endpoint (`/api/endpoints/1/teamaccesspolicies`). Current Portainer BE API updates environment team access through `PUT /api/endpoints/{id}` with `TeamAccessPolicies` in the request body. I corrected the endpoint and added a `/api/roles` lookup step so the role assignment example is grounded in the current API.
- The post assumed direct team-name matching for all providers. That is not correct for providers like Microsoft Entra that commonly emit Object IDs. I adjusted the prerequisites, Step 4, and conclusion to distinguish between direct name matching and Portainer’s static claim-to-team mappings.

## Review Notes
- Microsoft Entra can omit `groups` claims entirely when a user is in too many groups; Microsoft documents JWT group-claim limits and recommends app-assigned groups or filtering in larger environments.
- Authelia’s OpenID Connect provider is still documented as open beta, so deployments using it should be validated against the exact Authelia release in use.
- authentik’s current Portainer integration guide is validated against authentik 2025.10.3 and Portainer 2.33.6 LTS; the corrected post now aligns with current Portainer 2.39.1 docs/API for the areas covered here.
