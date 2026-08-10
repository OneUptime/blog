# Validation Summary: How to Fix AADSTS700016: Wrong Tenant, Client ID, or Missing Service Principal?

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered

- Microsoft Entra ID
- Microsoft identity platform OAuth 2.0 and OpenID Connect endpoints
- OAuth 2.0 client credentials and authorization code flows
- Microsoft Entra application objects and service principals
- Microsoft Graph v1.0
- Azure CLI
- Managed identities for Azure resources

## Sources Consulted

- [Microsoft Entra authentication and authorization error codes](https://learn.microsoft.com/en-us/entra/identity-platform/reference-error-codes)
- [Error AADSTS7000112 - Application is disabled](https://learn.microsoft.com/en-us/troubleshoot/entra/entra-id/app-integration/error-code-aadsts7000112-application-is-disabled)
- [AADSTS500011 - Resource Principal Not Found](https://learn.microsoft.com/en-us/troubleshoot/entra/entra-id/app-integration/error-code-aadsts500011-resource-principal-not-found)
- [Microsoft identity platform and the OAuth 2.0 client credentials flow](https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-client-creds-grant-flow)
- [Acquire tokens to call a web API using a daemon application](https://learn.microsoft.com/en-us/entra/identity-platform/scenario-daemon-acquire-token)
- [Microsoft identity platform and OAuth 2.0 authorization code flow](https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-auth-code-flow)
- [OpenID Connect on the Microsoft identity platform](https://learn.microsoft.com/en-us/entra/identity-platform/v2-protocols-oidc)
- [How to configure daemon apps that call web APIs](https://learn.microsoft.com/en-us/entra/identity-platform/scenario-daemon-app-configuration)
- [Application and service principal objects in Microsoft Entra ID](https://learn.microsoft.com/en-us/entra/identity-platform/app-objects-and-service-principals)
- [Create an enterprise application from a multitenant application](https://learn.microsoft.com/en-us/entra/identity/enterprise-apps/create-service-principal-cross-tenant)
- [Service principal-less authentication mitigation](https://learn.microsoft.com/en-us/entra/identity-platform/retire-service-principal-less-authentication)
- [Service principal required for Microsoft Entra ID](https://techcommunity.microsoft.com/blog/microsoft-entra-blog/service-principal-required-for-microsoft-entra-id/4405796/)
- [Validation differences by supported account types (`signInAudience`)](https://learn.microsoft.com/en-us/entra/identity-platform/supported-accounts-validation)
- [Microsoft Graph: Get application](https://learn.microsoft.com/en-us/graph/api/application-get?view=graph-rest-1.0) and [Get servicePrincipal](https://learn.microsoft.com/en-us/graph/api/serviceprincipal-get?view=graph-rest-1.0)
- [Microsoft Graph: List applications](https://learn.microsoft.com/en-us/graph/api/application-list?view=graph-rest-1.0) and [List servicePrincipals](https://learn.microsoft.com/en-us/graph/api/serviceprincipal-list?view=graph-rest-1.0)
- [Azure CLI: `az ad app`](https://learn.microsoft.com/en-us/cli/azure/ad/app?view=azure-cli-latest), [`az ad sp`](https://learn.microsoft.com/en-us/cli/azure/ad/sp?view=azure-cli-latest), and [`az account`](https://learn.microsoft.com/en-us/cli/azure/account?view=azure-cli-latest)
- [Managed identities developer introduction and guidelines](https://learn.microsoft.com/en-us/entra/identity/managed-identities-azure-resources/overview-for-developers)
- [Register an application in Microsoft Entra ID](https://learn.microsoft.com/en-us/entra/identity-platform/quickstart-register-app)

## Issues Found

- The raw client-credentials example did not say that line breaks were illustrative or that form values must be encoded. Added the readability note and the Microsoft-documented requirement to form-encode every value, including the client secret, so secrets containing reserved characters are transmitted correctly.
- The service-principal-less authentication retirement was identified only as occurring in March 2026. Changed it to the documented effective date, March 31, 2026.
- The installation guidance could be read as allowing user consent for app-only permissions. Clarified that application permissions used by client-credentials workloads require administrator consent.
- `AADSTS7000112` was described generically as a disabled client application. Corrected it to the more precise documented cause: a disabled service principal in the resource tenant, or a backing application that was disabled globally.
- The prevention guidance treated consent as a universal multitenant onboarding prerequisite, even though an authorized administrator can provision the service principal directly and some designs do not require a consent grant. Changed the guidance to require service-principal provisioning and any consent that the workload actually needs.
- The managed-identity guidance implied that all managed identities eliminate a client ID setting. User-assigned managed identities commonly require selection by client ID, resource ID, or object ID, so the text now states that managed identity eliminates the manually managed secret and that a system-assigned identity also eliminates the client ID setting.

## Review Notes

The Microsoft Graph examples are valid request fragments that query by `appId`; actual REST calls also require an authorization header and sufficient Microsoft Graph permissions. The Azure CLI commands and flags are current and documented, all five links in the post resolve to their intended Microsoft documentation, and no deprecated APIs were found.
