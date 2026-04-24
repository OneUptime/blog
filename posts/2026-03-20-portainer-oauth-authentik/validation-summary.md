# Validation Summary: How to Fix OAuth Login Issues with Authentik in Portainer - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Authentik
- OAuth 2.0
- OpenID Connect (OIDC)
- Docker
- Nginx

## Sources Consulted
- Portainer documentation: Authentication overview - https://docs.portainer.io/admin/settings/authentication
- Portainer documentation: Authenticate via OAuth - https://docs.portainer.io/admin/settings/authentication/oauth
- Authentik documentation: OAuth 2.0 provider - https://docs.goauthentik.io/add-secure-apps/providers/oauth2/
- Authentik documentation: Create an OAuth2 provider - https://docs.goauthentik.io/add-secure-apps/providers/oauth2/create-oauth2-provider
- Authentik documentation: Provider property mappings - https://docs.goauthentik.io/add-secure-apps/providers/property-mappings/
- Authentik release notes 2026.2 (`User.ak_groups` deprecation) - https://docs.goauthentik.io/releases/2026.2/
- Portainer official source code: OAuth service claim handling - https://github.com/portainer/portainer/blob/develop/api/oauth/oauth.go

## Issues Found
- The post said to create the OAuth configuration in “Portainer BE (Business Edition)”. Current Portainer documentation documents OAuth under the general authentication settings, and Portainer’s official source includes the OAuth flow in the main codebase. I changed this to “In Portainer” to avoid incorrectly implying the setup is BE-only.
- The Authentik redirect URI note said “exact, no trailing slash”. The strict requirement is exact matching with the Redirect URL configured in Portainer, not a universal “no trailing slash” rule. I corrected the wording so it matches Authentik’s redirect URI behavior.
- The token validation section claimed a specific 5-minute JWT tolerance and implied Portainer validates JWT timing directly. Portainer’s OAuth implementation exchanges the code, fetches user info from the configured resource endpoint, and parses `id_token` claims without claim validation. I changed this section to the accurate, narrower guidance that clock drift can still break time-sensitive OAuth/OIDC flows.
- The user claim mapping section overstated that Portainer needs a fixed set of claims from the userinfo endpoint. Portainer’s documented requirement is the configured User identifier claim, and team mapping uses a separate claim. I updated the section to focus on `email` or `preferred_username` plus optional `groups`.
- The team mapping section incorrectly suggested using `ak_groups` as the Portainer claim name and referred to a non-existent default Authentik OAuth mapping named “Groups”. Current Authentik documentation states the default `profile` scope includes group membership, and current release notes deprecate `User.ak_groups` in custom mappings. I corrected the instructions to use the `groups` claim and the default OpenID `profile` scope.
- The slug mismatch section incorrectly implied that all Authentik OAuth endpoints use the application slug. Authentik documents `authorize`, `token`, and `userinfo` as global endpoints, while discovery, JWKS, and end-session are slug-specific. I corrected that distinction.

## Review Notes
- The guide is technically relevant and salvageable; it only needed targeted corrections, not restructuring.
- The post describes the setup as “OAuth 2.0”, but the actual configuration shown is OpenID Connect on top of OAuth 2.0 (`openid` scope, discovery document, userinfo endpoint). That framing is acceptable because Authentik’s provider supports both, but OIDC terminology is the more precise description.
- Portainer’s custom OAuth configuration also has an `Auth Style` setting. The post omits it, which is acceptable because the official Portainer documentation covers it and the default behavior can work with Authentik, but it is a version-sensitive field worth keeping in mind if readers still see token exchange failures.
