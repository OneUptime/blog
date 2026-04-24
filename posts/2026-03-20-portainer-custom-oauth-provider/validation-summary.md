# Validation Summary: How to Set Up a Custom OAuth Provider with Portainer - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- OAuth 2.0
- OpenID Connect (OIDC)
- Okta
- Auth0
- Keycloak
- authentik
- Dex
- Microsoft Entra ID / Azure AD

## Sources Consulted
- Portainer OAuth authentication docs: https://docs.portainer.io/admin/settings/authentication/oauth
- Portainer API docs index: https://docs.portainer.io/api/docs
- Portainer CE 2.39.1 OpenAPI schema: https://api-docs.portainer.io/versions/ce/2.39.1.yaml
- Portainer EE 2.39.1 OpenAPI schema: https://api-docs.portainer.io/versions/ee/2.39.1.yaml
- Portainer source, settings update handler: https://github.com/portainer/portainer/blob/d4114c510dbb4334ef5ebc847f3db58038ba6e65/api/http/handler/settings/settings_update.go
- Portainer source, OAuth settings model: https://github.com/portainer/portainer/blob/d4114c510dbb4334ef5ebc847f3db58038ba6e65/api/portainer.go
- Portainer source, built-in OAuth provider defaults: https://github.com/portainer/portainer/blob/d4114c510dbb4334ef5ebc847f3db58038ba6e65/app/portainer/oauth/components/oauth-settings/providers.js
- Okta authorization server and discovery docs: https://developer.okta.com/docs/concepts/auth-servers/
- Okta org authorization server metadata: https://developer.okta.com/docs/api/openapi/okta-oauth/oauth/tag/OrgAS/
- Auth0 OIDC discovery docs: https://auth0.com/docs/get-started/applications/configure-applications-with-oidc-discovery
- Auth0 application settings docs: https://auth0.com/docs/get-started/applications/application-settings
- Keycloak OIDC endpoint docs: https://www.keycloak.org/securing-apps/oidc-layers
- authentik OAuth 2.0 / OIDC provider docs: https://docs.goauthentik.io/add-secure-apps/providers/oauth2/
- Dex OpenID Connect docs: https://dexidp.io/docs/openid-connect/
- Microsoft Graph `/me` and user resource docs: https://learn.microsoft.com/en-us/graph/api/user-get?view=graph-rest-1.0 and https://learn.microsoft.com/en-us/graph/api/resources/user?view=graph-rest-1.0

## Issues Found
- The introduction and prerequisites list understated what Portainer custom OAuth actually needs. I updated the post to include `Resource URL`, `User Identifier`, and `Scopes`, and changed `UserInfo URL` to `Resource URL` to match Portainer's terminology and behavior.
- The discovery section implied that the OIDC discovery URL auto-configures Portainer. I corrected the wording so it now accurately states that discovery is used to look up the provider endpoints that must still be entered into Portainer.
- The API payload examples used noncanonical field naming for the settings object and the generic example included `HideInternalAuth`, which is exposed as a Business Edition field in current Portainer API docs rather than a generic CE-safe `OAuthSettings` example field. I aligned the example with the published schema by using `OAuthSettings`, aligned the auth request field names with Portainer's API model, and removed the BE-only field from the generic snippet.
- The Auth0 section was marked as `bash` even though it was a settings reference block, and the dashboard step used the wrong field name. I changed the fence to `text` and corrected the instruction to `Allowed Callback URLs`, which is the field Auth0 documents for regular web applications.
- The Azure AD row in the identifier table did not match Portainer's Microsoft provider defaults or Microsoft Graph's user shape. I updated it to `userPrincipalName`.
- The conclusion incorrectly referred to "five endpoint URLs" from discovery. I corrected it to the actual values Portainer needs: client credentials, authorization/token/resource URLs, user identifier, and scopes.

## Review Notes
- Portainer's `PUT /api/settings` endpoint replaces the nested `OAuthSettings` object rather than patching individual nested fields. When updating an existing OAuth configuration, omitted nested fields can be reset to zero values.
- `Hide internal authentication prompt` is documented in the Portainer UI/docs, but in the current published API schemas it is exposed in the EE schema rather than the CE schema.
- Discovery URL examples assume the provider is published at its default issuer/base path. Reverse proxies or custom issuer paths can change the exact discovery URL.
