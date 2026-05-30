# Validation Summary: How to Use Microsoft Graph API with Azure AD App Registrations

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Microsoft Graph API
- Microsoft Entra ID / Azure AD app registrations
- OAuth 2.0 authorization code flow
- Delegated and application permissions
- MSAL Node
- Express.js
- Microsoft Graph JavaScript SDK
- OpenSSL

## Sources Consulted
- Microsoft identity platform permissions and consent overview: https://learn.microsoft.com/en-us/entra/identity-platform/permissions-consent-overview
- Microsoft identity platform application and delegated permissions for access tokens: https://learn.microsoft.com/en-us/troubleshoot/entra/entra-id/app-integration/application-delegated-permission-access-tokens-identity-platform
- MSAL Node acquire token requests: https://learn.microsoft.com/en-us/entra/msal/javascript/node/acquire-token-requests
- MSAL Node accounts and token cache APIs: https://learn.microsoft.com/en-us/entra/msal/javascript/node/accounts
- Microsoft Graph permissions reference: https://learn.microsoft.com/en-us/graph/permissions-reference
- Microsoft Graph user sendMail API: https://learn.microsoft.com/graph/api/user-sendmail?view=graph-rest-1.0
- Microsoft Graph calendarView API: https://learn.microsoft.com/en-us/graph/api/user-list-calendarview?view=graph-rest-1.0
- Microsoft identity platform redirect URI configuration: https://learn.microsoft.com/en-us/entra/identity-platform/how-to-add-redirect-uri
- Microsoft identity platform redirect URI restrictions: https://learn.microsoft.com/en-us/azure/active-directory/develop/reply-url
- Microsoft Graph JavaScript SDK client guidance: https://learn.microsoft.com/en-us/graph/sdks/choose-authentication-providers

## Issues Found
- The Express.js sample used `req.session` and `req.body` but did not configure session or JSON body-parsing middleware. Added `express-session`, `express.json()`, and a minimal secure session setup so the sample code is internally consistent.
- The sample sent mail through `/me/sendMail` but the initial `SCOPES` array did not include `Mail.Send`. Added `Mail.Send` to match the documented least-privileged permission for the sendMail API.
- The permissions table listed `Teams.ReadBasic.All`, but the Microsoft Graph permission name is `Team.ReadBasic.All`. Corrected the permission name and description to match the Graph permissions reference.

## Review Notes
- The post uses the older Azure AD naming in several places; Microsoft documentation now generally uses Microsoft Entra ID. The Azure AD terminology is still commonly understood and was not changed because it is part of the post title and wording.
- The MSAL token-cache example is technically valid for a simple single-process sample, but production web apps should use a persistent/distributed token cache rather than relying on in-memory cache state.
