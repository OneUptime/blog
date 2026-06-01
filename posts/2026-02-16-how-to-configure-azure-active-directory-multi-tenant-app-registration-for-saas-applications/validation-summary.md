# Validation Summary: How to Configure Azure Active Directory Multi-Tenant App Registration

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Microsoft Entra ID / Azure Active Directory app registrations
- Multi-tenant OAuth 2.0 and OpenID Connect
- Microsoft identity platform admin consent
- Azure CLI
- Microsoft Graph permissions and lifecycle notifications
- Node.js, Express, MSAL Node, jsonwebtoken, and jwks-rsa
- SaaS tenant isolation patterns

## Sources Consulted
- Microsoft identity platform admin consent protocol: https://learn.microsoft.com/en-us/entra/identity-platform/v2-admin-consent
- Microsoft identity platform access token and issuer validation guidance: https://learn.microsoft.com/en-us/entra/identity-platform/access-tokens
- Microsoft Graph change notification lifecycle events: https://learn.microsoft.com/en-us/graph/change-notifications-lifecycle-events
- Azure CLI `az ad app` reference: https://learn.microsoft.com/en-us/cli/azure/ad/app?view=azure-cli-latest
- Azure CLI `az ad app credential` reference: https://learn.microsoft.com/en-us/cli/azure/ad/app/credential?view=azure-cli-latest
- Microsoft Graph permissions reference: https://learn.microsoft.com/en-us/graph/permissions-reference

## Issues Found
1. **Admin consent endpoint used the wrong path for a v2 request.** The post used `https://login.microsoftonline.com/common/adminconsent` while also using the v2 `scope` parameter. Microsoft documents the v2 admin consent endpoint as `https://login.microsoftonline.com/{tenant}/v2.0/adminconsent` and says not to use `common` for admin consent. Updated the URL to `https://login.microsoftonline.com/organizations/v2.0/adminconsent`.
2. **Admin consent redirect URI was not registered in the CLI example.** The code used `ADMIN_CONSENT_REDIRECT`, but the app registration command only registered the normal sign-in callback. Added the admin consent callback URI to `--web-redirect-uris`.
3. **Consent wording overstated admin consent requirements.** The post said every permission requires the customer's admin to consent. Microsoft Graph `User.Read` delegated permission does not require admin consent by default, although tenant policies can require it. Updated the wording to distinguish admin-consent permissions from tenant policy behavior.
4. **Admin consent callback did not validate `state`.** The sample generated a state token but did not validate it on callback. Added `validateStateToken(state)` before provisioning the tenant.
5. **Token validation guidance was incomplete for tenant-independent metadata.** Microsoft requires multi-tenant validation to check the issuer, tenant ID, and signing key issuer. Updated the sample to validate the tenant GUID, issuer format, and signing key issuer when exposed by the JWKS client. Also clarified that Microsoft Graph access tokens should be treated as opaque by client applications.
6. **Lifecycle event example used nonexistent Azure AD events.** The post referenced a general Azure AD lifecycle webhook and a `consentRevoked` change type. Microsoft Graph lifecycle notifications use `reauthorizationRequired`, `subscriptionRemoved`, and `missed`; they are for Graph change notification subscriptions, not general app-consent revocation webhooks. Replaced the example with Graph subscription lifecycle handling and direct 401/403 handling for consent or authorization failures.

## Review Notes
The post still uses "Azure AD" terminology, which remains widely understood, but Microsoft now brands the service as Microsoft Entra ID. A future editorial pass could update naming consistently without changing the technical flow.
