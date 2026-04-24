# Validation Summary: How to Configure SSO (Single Sign-On) in Portainer - Configuration

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer Business Edition authentication
- OAuth 2.0 / OpenID Connect-style SSO
- Microsoft Entra ID (Azure AD)
- Portainer HTTP API
- `curl`

## Sources Consulted
- Portainer OAuth authentication docs: https://docs.portainer.io/admin/settings/authentication/oauth
- Portainer authentication overview: https://docs.portainer.io/admin/settings/authentication
- Portainer FAQ on switching back to internal authentication: https://docs.portainer.io/faqs/troubleshooting/access-and-authentication/how-can-i-switch-back-to-internal-authentication
- Portainer FAQ on internal vs external authentication: https://docs.portainer.io/faqs/installing/can-i-use-internal-authentication-and-external-authentication-at-the-same-time
- Portainer API documentation index: https://docs.portainer.io/api/docs
- Portainer Business Edition 2.39.1 OpenAPI spec: https://api-docs.portainer.io/versions/ee/2.39.1.yaml
- Microsoft identity platform OpenID Connect docs: https://learn.microsoft.com/en-us/entra/identity-platform/v2-protocols-oidc

## Issues Found
- The post described Portainer SSO as automatically redirecting users to the IdP and skipping the Portainer login page entirely. Portainer’s official docs and source/API behavior show that `Use SSO` controls whether the provider is forced to prompt for credentials again; it does not by itself auto-redirect on page load. I corrected the introduction, comparison table, UI explanation, step-by-step flow, Azure section, and conclusion.
- The API example used `oauthsettings` instead of the current `OAuthSettings` field name used by Portainer’s API schema. I corrected the payload casing to match the Business Edition OpenAPI definition.
- The post recommended `?skipSSO=true` for break-glass access. Portainer’s official troubleshooting documentation uses `#!/internal-auth` as the internal-authentication path. I replaced the incorrect guidance.
- The post said to keep “at least one internal admin account” for emergency access. Portainer documents that only the initial admin user can still use internal authentication when external auth is enabled. I corrected the wording to refer to the initial admin account.
- The logout section stated that configuring `LogoutURI` ensures the IdP session is terminated. Portainer documents this as a logout URL used by the provider; exact session-termination behavior depends on the provider. I softened the claim accordingly.
- The Microsoft section referred to Azure AD and implied token return directly from the redirect. I updated the terminology to Microsoft Entra ID (Azure AD) and corrected the flow to authorization-code return followed by Portainer completing the OAuth login.

## Review Notes
- The post is now technically consistent with current Portainer Business Edition documentation and the 2.39.1 API schema.
- The API example still uses `POST /api/auth` to obtain a JWT, which is supported by the current API, although Portainer’s API access documentation recommends using user-created API access tokens (`X-API-Key`) for general API usage.
