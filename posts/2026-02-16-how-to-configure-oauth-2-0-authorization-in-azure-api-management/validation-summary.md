# Validation Summary: How to Configure OAuth 2.0 Authorization in Azure API Management

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure API Management
- OAuth 2.0
- Microsoft Entra ID / Azure AD app registrations
- JWT validation policies
- Microsoft identity platform v2.0 endpoints
- OAuth 2.0 client credentials flow
- PKCE

## Sources Consulted
- Microsoft Learn: Configure OAuth 2.0 user authorization in the developer portal test console - https://learn.microsoft.com/en-us/azure/api-management/api-management-howto-oauth2
- Microsoft Learn: Azure API Management validate-jwt policy reference - https://learn.microsoft.com/en-us/azure/api-management/validate-jwt-policy
- Microsoft Learn: API authentication and authorization in Azure API Management - https://learn.microsoft.com/en-us/azure/api-management/authentication-authorization-overview
- Microsoft Learn: Access token claims reference - https://learn.microsoft.com/en-us/entra/identity-platform/access-token-claims-reference
- Microsoft Learn: Scopes and permissions in the Microsoft identity platform - https://learn.microsoft.com/en-us/entra/identity-platform/scopes-oidc
- Microsoft Learn: Access tokens in the Microsoft identity platform - https://learn.microsoft.com/en-us/entra/identity-platform/access-tokens
- Microsoft Learn: Expose scopes in a protected web API - https://learn.microsoft.com/en-us/entra/identity-platform/scenario-protected-web-api-expose-scopes

## Issues Found
- The APIM portal navigation was outdated/inaccurate. Updated it to use Developer portal > OAuth 2.0 + OpenID Connect > OAuth 2.0 > Add, matching current Microsoft documentation.
- The post used Microsoft identity platform v2.0 endpoints but did not mention setting the API app's `requestedAccessTokenVersion` to `2`. Added this requirement so the v2 OpenID configuration and issuer example match the issued access token version.
- The scope and Application ID URI examples used `api://my-api-backend`, which is less accurate than the default App ID URI pattern recommended by Microsoft Entra. Updated examples to use `api://BACKEND_APP_CLIENT_ID`.
- The `validate-jwt` audience example used the Application ID URI. For Microsoft identity platform v2.0 access tokens, the `aud` claim is the API's client ID. Updated the single-tenant and multi-tenant audience examples to `BACKEND_APP_CLIENT_ID`.
- The `scp` required-claim check did not specify a separator. Because `scp` is a space-separated string of delegated scopes, added `separator=" "` to the policy example.
- The client credentials section said only that the client app needs an application permission, but it did not explain that the backend API must expose an app role first. Added a concise note to define an app role such as `API.ReadWrite`.
- The client credentials token request used the old placeholder resource in the `.default` scope. Updated it to `api://BACKEND_APP_CLIENT_ID/.default`.
- The token lifetime section said Azure AD access tokens are usually one hour and referred to a refresh token grant type in APIM. Updated it to the documented Microsoft Entra default lifetime range of 60 to 90 minutes and clarified that refresh depends on the OAuth provider issuing a refresh token, such as when `offline_access` is requested.
- The PKCE section said to select "Authorization code" to enable PKCE. Updated it to select "Authorization code + PKCE," which is the APIM grant type listed in the Microsoft documentation.

## Review Notes
The post remains technically relevant and accurate after the targeted fixes. Microsoft documentation also notes that `validate-azure-ad-token` is available for Microsoft Entra tokens, but the existing `validate-jwt` approach is still supported and valid.
