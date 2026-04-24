# Validation Summary: How to Set Up OAuth Authentication in Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- OAuth 2.0
- OpenID Connect (OIDC)
- Portainer HTTP API
- `curl`
- JSON configuration

## Sources Consulted
- Portainer OAuth authentication docs: https://docs.portainer.io/admin/settings/authentication/oauth
- Portainer API docs: https://docs.portainer.io/api/docs
- Portainer settings update handler: https://raw.githubusercontent.com/portainer/portainer/develop/api/http/handler/settings/settings_update.go
- Portainer settings and `OAuthSettings` model: https://raw.githubusercontent.com/portainer/portainer/develop/api/portainer.go
- Portainer public settings and OAuth login URI generation: https://raw.githubusercontent.com/portainer/portainer/develop/api/http/handler/settings/settings_public.go
- Portainer OAuth validation handler: https://raw.githubusercontent.com/portainer/portainer/develop/api/http/handler/auth/authenticate_oauth.go
- Portainer login UI labels: https://github.com/portainer/portainer/blob/develop/app/portainer/views/auth/auth.html
- OpenID Connect Core 1.0: https://openid.net/specs/openid-connect-core-1_0-final.html
- RFC 6749: The OAuth 2.0 Authorization Framework: https://www.rfc-editor.org/rfc/rfc6749

## Issues Found
- The API example used `oauthsettings` instead of `OAuthSettings` in the `PUT /api/settings` payload. I changed it to `OAuthSettings` because that is the field Portainer currently accepts.
- The API example included `HideInternalAuth` inside `OAuthSettings`. I removed it because it is not present in Portainer's current `OAuthSettings` API struct, so it is not part of the verified settings payload shown here.
- The redirect URL explanation implied Portainer always uses the root URL with only a trailing slash. I corrected it to say the redirect must be the exact public Portainer URL, including any non-default port or subpath.
- The login testing step implied the OAuth button always uses the configured provider name. I corrected it to note that custom providers display `Login with OAuth`, while built-in providers use provider-specific labels.

## Review Notes
- Portainer's current documentation commonly shows direct installations on `:9443`, but reverse-proxied deployments may use a different external URL. The post now reflects that the registered redirect must match the public URL users actually access.
- After these fixes, the post's Portainer OAuth flow description, settings overview, and API usage are technically consistent with current Portainer documentation and source.
