# Validation Summary: How to Configure OAuth Redirect and Callback URLs in Portainer

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- Portainer (OAuth settings, REST API)
- OAuth 2.0 / OpenID Connect
- Identity providers: GitHub, Azure AD, Google, Keycloak
- curl, Python (jq alternative for JSON parsing)

## Sources Consulted
- Portainer source code (verified via cloned repo):
  - `api/portainer.go` — `OAuthSettings` struct definition with `RedirectURI` field
  - `api/oauth/oauth.go` — `RedirectURL` is passed verbatim to `oauth2.Config`
  - `api/http/handler/settings/settings_update.go` — `PUT /api/settings` endpoint
  - `api/http/handler/auth/authenticate.go` — `POST /api/auth` endpoint and JWT response shape
  - `app/portainer/oauth/components/oauth-settings/oauth-settings.html` — UI label "Redirect URL", tooltip text, placeholder `http://yourportainer.com/`
- Portainer documentation: https://docs.portainer.io/admin/settings/authentication/oauth
- OAuth 2.0 spec (RFC 6749) for `redirect_uri` matching semantics

## Issues Found

1. **Incorrect claim that trailing slash is required by Portainer**
   - **Original text**: "Note the trailing slash - it's required by Portainer. Without it, you'll get a `redirect_uri_mismatch` error."
   - **Problem**: Portainer does not enforce or validate a trailing slash. The `RedirectURI` value is passed verbatim to Go's `oauth2.Config.RedirectURL`. The `redirect_uri_mismatch` error is returned by the OAuth provider (Google/Azure/GitHub), not Portainer, when the URI sent does not match what is registered at the provider exactly. Portainer's UI placeholder happens to show a trailing-slash form, but this is a convention, not a requirement.
   - **Fix**: Reworded to clarify that the placeholder convention uses a trailing slash and that the `redirect_uri_mismatch` error originates from the OAuth provider, requiring byte-for-byte match between Portainer's configured value and what's registered at the IdP.

## Review Notes

- The `PUT /api/settings` endpoint with `OAuthSettings.RedirectURI` payload is correct against current Portainer source.
- The `POST /api/auth` endpoint with `{username, password}` body returning `{jwt: "..."}` is verified correct.
- The UI label "Redirect URL" matches the actual Portainer interface; the post correctly distinguishes it from the OAuth provider's callback URL.
- Per-provider registration steps (GitHub, Azure AD, Google, Keycloak) match each provider's current console terminology.
- The `--insecure` flag in the curl examples is appropriate for the localhost self-signed-cert scenario typical of a default Portainer install on `:9443`.
- The list of common causes for `redirect_uri_mismatch` (trailing slash, http/https, port, subdomain) is accurate and matches the OAuth 2.0 spec's requirement for exact-string matching of the `redirect_uri` parameter.
