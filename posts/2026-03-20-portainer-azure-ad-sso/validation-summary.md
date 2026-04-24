# Validation Summary: How to Configure Microsoft Azure AD (Entra ID) SSO with Portainer (2)

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer OAuth authentication
- Microsoft Entra ID (Azure AD)
- OAuth 2.0 / OpenID Connect
- Microsoft Graph
- Portainer HTTP API
- Bash / curl

## Sources Consulted
- Portainer OAuth authentication docs: https://docs.portainer.io/sts/admin/settings/authentication/oauth
- Portainer API docs (`/settings` update schema, 2.39.1 CE): https://api-docs.portainer.io/?edition=ce&version=2.39.1
- Portainer source for Microsoft provider defaults: https://github.com/portainer/portainer/blob/2.39.1/app/portainer/oauth/components/oauth-settings/providers.js
- Portainer source for settings update payload and `OAuthSettings` request field: https://github.com/portainer/portainer/blob/2.39.1/api/http/handler/settings/settings_update.go
- Microsoft identity platform OIDC scopes: https://learn.microsoft.com/en-us/entra/identity-platform/scopes-oidc
- Microsoft identity platform UserInfo endpoint: https://learn.microsoft.com/en-us/entra/identity-platform/userinfo
- Microsoft Graph `GET /me` docs: https://learn.microsoft.com/en-us/graph/api/user-get?view=graph-rest-1.0
- Microsoft Graph permissions reference: https://learn.microsoft.com/en-us/graph/permissions-reference
- Microsoft optional claims reference: https://learn.microsoft.com/en-us/entra/identity-platform/optional-claims-reference

## Issues Found
- The Portainer UI section mixed the built-in Microsoft provider with custom OAuth override fields. I corrected Step 4 so the main setup uses the actual Microsoft provider inputs and kept the endpoint details as override defaults.
- The article used `https://graph.microsoft.com/oidc/userinfo`, `unique_name`, and `openid email profile` as if they were Portainer's current Microsoft defaults. Current Portainer defaults use `https://graph.microsoft.com/v1.0/me`, `userPrincipalName`, `profile openid`, and a Microsoft logout URL, so I updated the post accordingly.
- The API example used `oauthsettings` instead of `OAuthSettings`, which does not match Portainer's `/api/settings` request schema. I fixed the JSON key casing and aligned the payload with current Portainer fields.
- The permissions section omitted `User.Read`, while the current Portainer Microsoft defaults read the signed-in user's profile from Microsoft Graph `/me`. I added `User.Read` and clarified that `email` is only needed for email-based custom claims.
- The access restriction section referred to the app registration even though the described controls are configured on the enterprise application (service principal). I corrected that wording.
- The conclusion implied Azure group-based team mapping works automatically. I clarified that Entra ID groups must be exposed as a groups claim and mapped in Portainer using group Object IDs.

## Review Notes
- Portainer's default Microsoft identifier is `userPrincipalName`, which is readable but not immutable. If this post is later expanded into an advanced guide, it may be worth discussing identifier stability tradeoffs.
- The post still uses the older `Azure AD` name in parts of the copy. That is still understandable, but Microsoft is now consistently branding the service as `Microsoft Entra ID`.
