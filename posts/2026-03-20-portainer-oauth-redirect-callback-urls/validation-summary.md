# Validation Summary: How to Configure OAuth Redirect and Callback URLs in Portainer - Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- OAuth 2.0 redirect URIs and callback URLs
- Portainer HTTP API
- Microsoft Entra ID (Azure AD)
- Google OAuth 2.0
- GitHub OAuth Apps
- Keycloak
- authentik

## Sources Consulted
- Portainer OAuth authentication docs: https://docs.portainer.io/sts/admin/settings/authentication/oauth
- Portainer API docs: https://docs.portainer.io/api/docs
- Portainer CLI configuration docs: https://docs.portainer.io/sts/advanced-topics/cli
- Portainer source (`api/oauth/oauth.go`): https://github.com/portainer/portainer/blob/develop/api/oauth/oauth.go
- Portainer source (`api/http/handler/settings/settings_update.go`): https://github.com/portainer/portainer/blob/develop/api/http/handler/settings/settings_update.go
- Portainer source (`api/portainer.go`): https://github.com/portainer/portainer/blob/develop/api/portainer.go
- Microsoft Entra redirect URI docs: https://learn.microsoft.com/en-us/entra/identity-platform/how-to-add-redirect-uri
- Google OAuth web server docs: https://developers.google.com/identity/protocols/oauth2/web-server
- GitHub OAuth app authorization docs: https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps
- Keycloak server administration guide: https://www.keycloak.org/docs/26.3.3/server_admin/
- authentik OAuth2 provider docs: https://docs.goauthentik.io/add-secure-apps/providers/oauth2/

## Issues Found
- The post claimed Portainer's redirect URI is always the root URL with a mandatory trailing slash. I corrected this because Portainer uses the configured `RedirectURI` value as-is, and subpath deployments are supported.
- The `PUT /api/settings` example used `oauthsettings` instead of `OAuthSettings`. I corrected the JSON key casing to match Portainer's API schema.
- The API example used invalid placeholder JSON and implied you could update only `RedirectURI`. I replaced it with a syntactically valid full `OAuthSettings` example and noted that Portainer replaces the struct rather than merging a single field.
- The diagnostic command queried `oauthsettings` instead of `OAuthSettings`. I fixed the key so the example matches the actual response format.
- The Keycloak section said to add the Portainer URL to `Web origins`. I removed that because `Valid redirect URIs` is the redirect validation control; `Web origins` is for CORS, not callback URL matching.
- The subpath startup example used `--base-url=/portainer`. I aligned it with Portainer's documented form `--base-url /portainer`.
- The IdP heading used the outdated "Azure AD" name. I updated it to "Microsoft Entra ID (Azure AD)" for current accuracy.

## Review Notes
- Portainer's documentation describes the redirect URL as the Portainer instance URL, and Portainer source confirms the configured `RedirectURI` is passed directly to the OAuth client without trailing-slash normalization.
- The post is technically correct after these fixes. Using the exact public URL Portainer is configured to send remains the safest cross-provider guidance.
