# Validation Summary: How to Set Up OAuth Authentication in Portainer - Set

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Portainer
- OAuth 2.0
- OpenID Connect
- Portainer HTTP API
- curl
- JSON

## Sources Consulted
- Portainer documentation: Authenticate via OAuth - https://docs.portainer.io/sts/admin/settings/authentication/oauth
- Portainer documentation: Accessing the Portainer API - https://docs.portainer.io/api/access
- Portainer documentation: API documentation - https://docs.portainer.io/api/docs
- Portainer 2.39.1 source: OAuthSettings and AuthenticationMethod definitions - https://raw.githubusercontent.com/portainer/portainer/2.39.1/api/portainer.go
- Portainer 2.39.1 source: settings update API payload and validation - https://raw.githubusercontent.com/portainer/portainer/2.39.1/api/http/handler/settings/settings_update.go
- Portainer 2.39.1 source: OAuth public login URI generation - https://raw.githubusercontent.com/portainer/portainer/2.39.1/api/http/handler/settings/settings_public.go
- Portainer 2.39.1 source: OAuth authentication flow - https://raw.githubusercontent.com/portainer/portainer/2.39.1/api/oauth/oauth.go
- OAuth 2.0 RFC 6749 - https://datatracker.ietf.org/doc/html/rfc6749

## Issues Found
- The post originally said all OAuth applications require `openid`, `profile`, and `email` scopes at minimum. This is not universally correct because OAuth scopes are provider-defined, and `openid` applies to OpenID Connect providers rather than every OAuth provider. Changed the wording to direct readers to their provider documentation and state that `openid profile email` is common for OIDC providers.
- The post originally said the trailing slash in the redirect URL is required. Portainer stores and sends the configured Redirect URL, and OAuth redirect URI validation depends on exact matching with the identity provider registration. Changed the wording to say the URL should be registered exactly as it appears in Portainer's Redirect URL field.

## Review Notes
- The Portainer API payload field names in the post match the Portainer 2.39.1 `OAuthSettings` model.
- `AuthenticationMethod: 3` correctly selects OAuth in Portainer.
- The `/api/auth` JWT flow and `Authorization: Bearer` header remain supported by Portainer source, although current Portainer API documentation recommends API access tokens with the `X-API-Key` header for general API use.
