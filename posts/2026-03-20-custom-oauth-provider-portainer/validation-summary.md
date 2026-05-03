# Validation Summary: How to Set Up a Custom OAuth Provider with Portainer

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Portainer (custom OAuth configuration via REST API)
- OAuth 2.0 / OpenID Connect
- OIDC discovery document (`.well-known/openid-configuration`)
- Bash, curl, Python (json.tool) for API interaction
- Docker (for Portainer log inspection)

## Sources Consulted
- Portainer official OAuth docs: https://docs.portainer.io/admin/settings/authentication/oauth
- Portainer source — `api/oauth/oauth.go`: https://github.com/portainer/portainer/blob/develop/api/oauth/oauth.go
- Portainer source — `api/portainer.go` (AuthenticationMethod type): https://github.com/portainer/portainer/blob/develop/api/portainer.go
- OpenID Connect Discovery 1.0 spec (for `.well-known/openid-configuration` and standard endpoint names `authorization_endpoint`, `token_endpoint`, `userinfo_endpoint`)
- Portainer HTTP API (`/api/auth`, `/api/settings`)

## Issues Found
No technical issues found.

Verified:
- `AuthenticationMethod: 3` correctly maps to OAuth in Portainer's `AuthenticationMethod` enum (1 = internal, 2 = LDAP, 3 = OAuth).
- `OAuthSettings` field names (`ClientID`, `ClientSecret`, `AuthorizationURI`, `AccessTokenURI`, `ResourceURI`, `RedirectURI`, `UserIdentifier`, `Scopes`, `OAuthAutoCreateUsers`, `DefaultTeamID`) match the Go struct in `api/oauth/oauth.go` / `api/portainer.go`.
- `/api/auth` returns a JSON object containing a `jwt` field, which is correctly extracted with `json.load(sys.stdin)['jwt']`.
- `PUT /api/settings` is the correct admin endpoint for updating settings including `OAuthSettings`.
- OIDC discovery URL (`/.well-known/openid-configuration`) and the endpoint names listed in the example output (`authorization_endpoint`, `token_endpoint`, `userinfo_endpoint`) are per the OpenID Connect Discovery 1.0 specification.
- Suggested claims (`sub`, `email`, `preferred_username`) are valid OIDC standard claims; `login` is correctly noted as GitHub-specific.

## Review Notes
- The post does not configure `LogoutURI`, `SSO`, or `AuthStyle` fields, which exist on `OAuthSettings`. These are optional and not required for a basic custom OAuth setup, so the omission is acceptable.
- The `--insecure` flag is used against `https://localhost:9443` because Portainer ships with a self-signed certificate by default — appropriate for the local-admin context shown.
- The example uses `DefaultTeamID: 0`, which means no default team. This is valid; non-zero values would need a real team ID from `/api/teams`.
- The `RedirectURI` value `https://portainer.example.com/` (with trailing slash) is what Portainer expects; the troubleshooting tip about trailing-slash mismatches is accurate.
