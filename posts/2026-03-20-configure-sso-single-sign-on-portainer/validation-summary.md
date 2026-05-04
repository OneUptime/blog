# Validation Summary: How to Configure SSO (Single Sign-On) in Portainer

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Portainer (Business Edition)
- OAuth 2.0
- OpenID Connect (OIDC)
- Single Sign-On (SSO)
- Identity Providers (Azure AD/Entra ID, Google Workspace, Okta, Auth0, Keycloak, GitHub, GitLab, Authelia, Authentik)
- Portainer REST API (`/api/auth`, `/api/settings`)
- curl, bash, python3

## Sources Consulted
- Portainer official source code: `api/portainer.go` (https://github.com/portainer/portainer/blob/master/api/portainer.go) — verified `AuthenticationMethod` constants and `OAuthSettings` struct field names
- Portainer OAuth documentation (https://docs.portainer.io/admin/settings/authentication/oauth) — verified UI navigation path and field semantics
- Portainer Authentication documentation (https://docs.portainer.io/admin/settings/authentication) — verified general SSO/OAuth flow
- Portainer CE vs BE comparison (https://www.portainer.io/blog/portainer-community-edition-ce-vs-portainer-business-edition-be-whats-the-difference)

## Issues Found
No technical issues found.

Verification details:
- `AuthenticationMethod: 3` for OAuth is correct. The Portainer source defines `_ = iota` (skipping 0), then `AuthenticationInternal = 1`, `AuthenticationLDAP = 2`, `AuthenticationOAuth = 3`.
- All `OAuthSettings` field names in the API example (`ClientID`, `ClientSecret`, `AuthorizationURI`, `AccessTokenURI`, `ResourceURI`, `RedirectURI`, `UserIdentifier`, `Scopes`, `OAuthAutoCreateUsers`, `DefaultTeamID`) match the upstream Go struct exactly, including casing.
- `HideInternalAuth` is a valid OAuth-related setting documented in Portainer's OAuth docs ("Hide internal authentication prompt") and is exposed via the same OAuthSettings payload in BE.
- The default Portainer HTTPS port (`9443`) is correct.
- API endpoints `/api/auth` (POST for JWT) and `/api/settings` (PUT for settings) are correct.
- UI navigation path "Settings > Authentication > OAuth" matches the official documentation.
- The bash + python3 quoting in the curl pipelines is valid (single quotes inside double-quoted `python3 -c "..."` are literal).
- The OAuth 2.0 / OIDC flow described in the Mermaid diagram is accurate to the Authorization Code flow.

## Review Notes
- The post tags include "SAML", but the body only covers OAuth 2.0 / OIDC. Portainer Business Edition does support SAML separately, but it is not discussed here. This is a tag/content mismatch rather than a technical inaccuracy, so no edit was made.
- The intro line "Portainer BE supports any OAuth 2.0 / OIDC provider" is accurate, though Portainer CE also supports custom OAuth providers (only the pre-built provider templates and automatic group-to-team membership are BE-only). The phrasing does not exclude CE, so it's not factually wrong.
- The `--insecure` curl flag is appropriate for the localhost self-signed cert example but readers should remove it in production. This is a stylistic note only.
- Token expiry guidance ("Portainer inherits session expiry from the OAuth token validity") is accurate for the OAuth path; Portainer also has a separate `UserSessionTimeout` setting that can apply, but the post's statement is not wrong.
