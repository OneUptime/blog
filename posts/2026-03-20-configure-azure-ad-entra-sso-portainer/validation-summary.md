# Validation Summary: How to Configure Microsoft Azure AD (Entra ID) SSO with Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Microsoft Entra ID
- Microsoft Graph
- OAuth 2.0
- OpenID Connect
- cURL

## Sources Consulted
- Portainer OAuth authentication docs: https://docs.portainer.io/admin/settings/authentication/oauth
- Portainer API docs overview: https://docs.portainer.io/api/docs
- Portainer OAuth settings schema: https://github.com/portainer/portainer/blob/develop/api/portainer.go
- Portainer settings update handler: https://github.com/portainer/portainer/blob/develop/api/http/handler/settings/settings_update.go
- Portainer OAuth implementation: https://github.com/portainer/portainer/blob/develop/api/oauth/oauth.go
- Portainer Microsoft provider defaults: https://github.com/portainer/portainer/blob/develop/app/portainer/oauth/components/oauth-settings/providers.js
- Microsoft identity platform protocols: https://learn.microsoft.com/en-us/entra/identity-platform/v2-protocols
- Scopes and permissions in the Microsoft identity platform: https://learn.microsoft.com/en-us/entra/identity-platform/scopes-oidc
- Microsoft identity platform UserInfo endpoint: https://learn.microsoft.com/en-us/entra/identity-platform/userinfo
- Microsoft Graph `GET /me` docs: https://learn.microsoft.com/en-us/graph/api/user-get?view=graph-rest-1.0
- Manage users and groups assignment to an application: https://learn.microsoft.com/en-us/entra/identity/enterprise-apps/assign-user-or-group-access-portal

## Issues Found
- The API permissions section only mentioned `User.Read`. I updated it to also include the delegated `openid`, `profile`, and `email` permissions, which align with Portainer's Microsoft OAuth setup and Microsoft's OpenID Connect guidance.
- The Portainer API payload omitted `LogoutURI` and `AuthStyle`, even though Portainer's current Microsoft provider defaults include both. I added `LogoutURI` and set `AuthStyle` to `1` (`In Params`) to match current Portainer behavior.
- The configuration summary listed `mail` as an alternative user identifier. I changed this to `userPrincipalName`, which is Portainer's current Microsoft default and is more reliable for Entra-backed sign-in.

## Review Notes
- Portainer's current Microsoft provider configuration uses `https://graph.microsoft.com/v1.0/me` as the resource endpoint and merges claims from the returned `id_token` when present.
- The `/api/auth` example is valid for retrieving a JWT, and `/api/settings` accepts the partial OAuth settings payload shown in the post.
- The redirect URI must exactly match the URL users access for Portainer. If Portainer is exposed directly on its default HTTPS port, that usually means including `:9443` in the registered redirect URI.
