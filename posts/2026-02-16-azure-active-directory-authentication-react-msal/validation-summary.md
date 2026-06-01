# Validation Summary: Use Azure Active Directory Authentication in a React Application with MSAL.js

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Microsoft Entra ID / Azure Active Directory
- React
- TypeScript
- MSAL.js
- `@azure/msal-browser`
- `@azure/msal-react`
- Azure CLI
- Microsoft Graph API
- OAuth 2.0 / OpenID Connect

## Sources Consulted
- Microsoft Learn: Get started with MSAL React - https://learn.microsoft.com/en-us/entra/msal/javascript/react/getting-started
- Microsoft Learn: MSAL Browser events - https://learn.microsoft.com/en-us/entra/msal/javascript/browser/events
- Microsoft Learn: MSAL Browser configuration options - https://learn.microsoft.com/en-us/entra/msal/javascript/browser/configuration
- Microsoft Learn: MSAL.js caching - https://learn.microsoft.com/en-us/entra/msal/javascript/browser/caching
- Microsoft Learn: Sign out users with MSAL.js - https://learn.microsoft.com/en-us/entra/msal/javascript/browser/logout
- Microsoft Learn: Single-page application app registration - https://learn.microsoft.com/en-us/entra/identity-platform/scenario-spa-app-registration
- Microsoft Learn: Microsoft identity platform application types - https://learn.microsoft.com/en-us/entra/identity-platform/v2-app-types
- Microsoft Learn: OAuth 2.0 authorization code flow and SPA redirect URI requirements - https://learn.microsoft.com/en-us/azure/active-directory/develop/v2-oauth2-auth-code-flow
- Microsoft Learn: Azure CLI `az ad app create` reference - https://learn.microsoft.com/en-us/cli/azure/ad/app
- Microsoft Learn: Azure CLI `az rest` reference - https://learn.microsoft.com/en-us/cli/azure/reference-index
- Microsoft Learn: Microsoft Graph application manifest `spa.redirectUris` - https://learn.microsoft.com/en-us/entra/identity-platform/reference-microsoft-graph-app-manifest
- Microsoft Learn: Acquire tokens in single-page apps - https://learn.microsoft.com/en-us/entra/identity-platform/scenario-spa-acquire-token
- Microsoft Learn: Expose scopes in a protected web API - https://learn.microsoft.com/en-us/entra/identity-platform/scenario-protected-web-api-expose-scopes
- Microsoft Learn: Configure app permissions for a web API - https://learn.microsoft.com/en-us/entra/identity-platform/quickstart-configure-app-access-web-apis

## Issues Found
- The Azure CLI registration example used `--web-redirect-uris` and enabled implicit grant token issuance. Current Microsoft guidance for React/MSAL single-page apps is to configure Single-page application redirect URIs and use authorization code flow with PKCE. Updated the command to create the app registration first, then configure `spa.redirectUris` through Microsoft Graph using `az rest`.
- The Microsoft Graph profile token request included `Mail.Read`, but the example only calls `/me`, which requires `User.Read`. Removed `Mail.Read` from the Graph scopes to match the API call and avoid unnecessary consent.
- The custom backend API example requested `api://YOUR_API_CLIENT_ID/.default`. For a SPA calling a protected API on behalf of a signed-in user, Microsoft guidance is to expose and request delegated scopes such as `api://YOUR_API_CLIENT_ID/access_as_user`. Updated the example scope accordingly.

## Review Notes
The remaining MSAL React usage, including `MsalProvider`, `AuthenticatedTemplate`, `UnauthenticatedTemplate`, `useMsal`, popup/redirect login methods, `acquireTokenSilent` with `InteractionRequiredAuthError` fallback, and `logoutPopup` usage, matches current documented APIs. `create-react-app` is not the preferred way to start many new React projects in 2026, but the command is still a recognizable React setup path and was not treated as a technical correctness error.
