# Validation Summary: How to Configure Azure Active Directory B2C

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Azure Active Directory B2C
- Microsoft Entra ID / Microsoft Graph
- Azure CLI `az rest`
- OAuth 2.0 and OpenID Connect
- Azure AD B2C user flows and custom policies
- ASP.NET Core
- Microsoft.Identity.Web
- MSAL.js and MSAL React

## Sources Consulted
- Azure AD B2C FAQ: https://learn.microsoft.com/en-us/azure/active-directory-b2c/faq
- Tutorial - Create an Azure Active Directory B2C tenant: https://learn.microsoft.com/en-us/azure/active-directory-b2c/tutorial-create-tenant
- Tutorial - Register a web application in Azure Active Directory B2C: https://learn.microsoft.com/en-us/azure/active-directory-b2c/tutorial-register-applications
- Configure authentication in a sample web app by using Azure AD B2C: https://learn.microsoft.com/en-us/azure/active-directory-b2c/configure-authentication-sample-web-app
- Configure authentication in a sample React SPA by using Azure AD B2C: https://learn.microsoft.com/en-us/azure/active-directory-b2c/configure-authentication-sample-react-spa-app
- Enable authentication in a web API by using Azure AD B2C: https://learn.microsoft.com/en-us/azure/active-directory-b2c/enable-authentication-web-api
- Use MSAL.js with Azure AD B2C: https://learn.microsoft.com/en-us/entra/msal/javascript/browser/working-with-b2c
- Customize the UI with HTML templates in Azure AD B2C: https://learn.microsoft.com/en-us/azure/active-directory-b2c/customize-ui-with-html
- Microsoft Graph application addPassword API: https://learn.microsoft.com/en-us/graph/api/application-addpassword
- Microsoft Graph list signIns API: https://learn.microsoft.com/en-us/graph/api/signin-list
- Azure AD B2C tenants REST API: https://learn.microsoft.com/en-us/rest/api/activedirectory/b2c-tenants/get

## Issues Found
- Added the current Azure AD B2C availability caveat: as of May 1, 2025, Azure AD B2C is no longer available to purchase for new customers, while existing customers can continue using it. The original introduction omitted this important current limitation.
- Corrected the tenant creation/linking wording. The Azure portal is the documented path for creating and linking a B2C tenant, while `az account set` only selects a subscription for later CLI calls.
- Changed the sample web app redirect URI from `/auth/callback` to `/signin-oidc` so it matches the default Microsoft.Identity.Web OpenID Connect callback path used by the sample configuration.
- Added a note that the React redirect URI must be registered under the app registration's Single-page application platform before using it in MSAL.
- Removed an unused `useIsAuthenticated` import from the React example.
- Renamed "Enable Audit Logs" to "View Sign-In Logs" and added the required Microsoft Graph permission and role note for the `/auditLogs/signIns` API.

## Review Notes
Azure AD B2C remains usable for existing customers, but new customer scenarios should generally evaluate Microsoft Entra External ID for customers. The article intentionally stays focused on Azure AD B2C because the requested post is a B2C configuration guide.
