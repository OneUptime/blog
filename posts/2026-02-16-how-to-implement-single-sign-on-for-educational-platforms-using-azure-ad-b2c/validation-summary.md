# Validation Summary: How to Implement Single Sign-On for Educational Platforms Using Azure AD B2C

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Azure AD B2C
- Microsoft Entra ID
- OpenID Connect
- OAuth 2.0
- Google identity provider federation
- Microsoft Account identity provider federation
- Azure CLI app registration
- MSAL Node
- Express.js
- Azure AD B2C user flows and custom attributes
- Azure AD B2C custom HTML page layouts

## Sources Consulted
- Azure AD B2C FAQ: https://learn.microsoft.com/en-us/azure/active-directory-b2c/faq
- Azure AD B2C technical overview: https://learn.microsoft.com/en-us/azure/active-directory-b2c/technical-overview
- Azure CLI `az ad app create` documentation: https://learn.microsoft.com/en-us/cli/azure/ad/app
- Azure AD B2C Google identity provider documentation: https://learn.microsoft.com/en-us/azure/active-directory-b2c/identity-provider-google
- Azure AD B2C Microsoft Account identity provider documentation: https://learn.microsoft.com/en-us/azure/active-directory-b2c/identity-provider-microsoft-account
- Azure AD B2C Microsoft Entra ID single-tenant identity provider documentation: https://learn.microsoft.com/en-us/azure/active-directory-b2c/identity-provider-azure-ad-single-tenant
- Azure AD B2C custom attribute documentation: https://learn.microsoft.com/en-us/azure/active-directory-b2c/user-flow-custom-attributes
- MSAL Node token acquisition documentation: https://learn.microsoft.com/en-us/entra/msal/javascript/node/acquire-token-requests
- Azure AD B2C custom HTML UI documentation: https://learn.microsoft.com/en-us/azure/active-directory-b2c/customize-ui-with-html
- Azure AD B2C age-gating documentation: https://learn.microsoft.com/en-us/azure/active-directory-b2c/age-gating
- Azure AD B2C user access and parental consent documentation: https://learn.microsoft.com/en-us/azure/active-directory-b2c/manage-user-access
- Azure AD B2C data residency documentation: https://learn.microsoft.com/en-us/azure/active-directory-b2c/data-residency

## Issues Found
- The post instructed readers to create a new Azure AD B2C tenant without noting that Azure AD B2C is no longer available to purchase for new customers as of May 1, 2025. Added a caveat and positioned the tutorial for existing B2C tenants, with Microsoft Entra External ID as the new-deployment alternative.
- The Microsoft Account provider section said it covered school Office 365 accounts. Corrected this because the built-in Microsoft Account provider is for personal Microsoft accounts; school Microsoft Entra ID tenants should be federated as OpenID Connect providers.
- The user flow JSON looked like a directly uploadable Azure AD B2C configuration. Clarified that it is an illustrative target configuration and added the required step to create custom user attributes before selecting them for user input and application claims.
- The Express logout route called `req.session.destroy()` and redirected immediately. Updated it to redirect from the destroy callback so the session cleanup completes before sending the browser to the B2C logout endpoint.
- The school federation section used older Azure AD terminology and implied access is automatically revoked in the application when a school account is disabled. Updated the wording to Microsoft Entra ID and clarified that future federated sign-ins fail, while the application still needs its own session expiry and authorization checks.
- The security section implied Azure AD B2C can fully require parental consent for minors by configuration. Corrected this to reflect that age gating is a preview feature and that the application or another service must implement the parental consent and adult-verification experience required by policy.

## Review Notes
Azure AD B2C remains technically valid for existing customers, but it is not the recommended choice for brand-new customer identity deployments after the May 1, 2025 end-of-sale date. The Express example is intentionally minimal and should be hardened for production with CSRF/state validation, secure session storage, HTTPS-only deployment, and authorization checks backed by server-side policy rather than user-selected roles alone.
