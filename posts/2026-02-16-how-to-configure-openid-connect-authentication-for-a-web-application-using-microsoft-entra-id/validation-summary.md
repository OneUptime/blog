# Validation Summary: How to Configure OpenID Connect Authentication for a Web Application

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- OpenID Connect
- OAuth 2.0 authorization code flow
- Microsoft Entra ID / Microsoft identity platform
- MSAL Node (`@azure/msal-node`)
- Node.js and Express
- `express-session`
- Microsoft Graph delegated scopes

## Sources Consulted
- Microsoft identity platform OpenID Connect protocol documentation: https://learn.microsoft.com/en-us/entra/identity-platform/v2-protocols-oidc
- Microsoft identity platform app registration documentation: https://learn.microsoft.com/en-us/entra/identity-platform/quickstart-register-app
- MSAL Node authorization code flow tutorial: https://learn.microsoft.com/en-us/entra/identity-platform/tutorial-v2-nodejs-webapp-msal
- MSAL Node configuration documentation: https://learn.microsoft.com/en-us/entra/msal/javascript/node/configuration
- MSAL JavaScript API reference: https://azuread.github.io/microsoft-authentication-library-for-js/
- Express session middleware documentation: https://github.com/expressjs/session

## Issues Found
- The MSAL logger example used `logLevel: 3` with a comment saying it was info-level logging. MSAL exposes `msal.LogLevel.Info`, so the snippet now uses the enum directly.
- The Express session cookie used `secure: true` while the testing instructions use `http://localhost:3000`. Browsers do not send secure cookies over plain HTTP, so the sample now enables secure cookies only when `NODE_ENV === 'production'`.
- The token refresh example looked up `req.session.homeAccountId`, but the login callback never stored that value. The callback now stores `response.account.homeAccountId` in the session.
- The ID token validation wording was too specific about MSAL internals. It now states that MSAL handles token response validation for the authorization code exchange and checks returned ID token claims.
- The state parameter pitfall said MSAL handles state automatically in a way that could imply custom application state never needs explicit handling. The note now distinguishes custom implementations and custom application state added to an MSAL flow.

## Review Notes
The sample remains intentionally minimal. A production Express deployment should also use a durable session store, HTTPS end to end, robust callback error handling, and a more complete token cache strategy when calling downstream APIs.
