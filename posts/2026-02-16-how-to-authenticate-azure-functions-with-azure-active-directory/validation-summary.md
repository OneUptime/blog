# Validation Summary: How to Authenticate Azure Functions with Azure Active Directory

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Functions
- Azure App Service authentication / Easy Auth
- Microsoft Entra ID / Azure Active Directory
- Azure CLI
- OAuth 2.0 and OpenID Connect
- JWT validation in .NET isolated worker functions
- Azure Identity for .NET

## Sources Consulted
- Microsoft Learn: Authentication and authorization in Azure App Service and Azure Functions - https://learn.microsoft.com/en-us/azure/app-service/overview-authentication-authorization
- Microsoft Learn: Work with user identities in Azure App Service authentication - https://learn.microsoft.com/en-us/azure/app-service/configure-authentication-user-identities
- Microsoft Learn: Configure Microsoft Entra Authentication for App Service - https://learn.microsoft.com/en-us/azure/app-service/configure-authentication-provider-aad
- Microsoft Learn: Azure CLI `az webapp auth` reference - https://learn.microsoft.com/en-us/cli/azure/webapp/auth?view=azure-cli-latest
- Microsoft Learn: Azure CLI `az webapp auth microsoft` reference - https://learn.microsoft.com/en-us/cli/azure/webapp/auth/microsoft?view=azure-cli-latest
- Microsoft Learn: Guide for running C# Azure Functions in an isolated worker process - https://learn.microsoft.com/en-us/azure/azure-functions/dotnet-isolated-process-guide
- Microsoft Learn: Scopes and permissions in the Microsoft identity platform - https://learn.microsoft.com/en-us/entra/identity-platform/scopes-oidc
- Microsoft Learn: `ConfigurationManager<T>.GetConfigurationAsync` API reference - https://learn.microsoft.com/en-us/dotnet/api/microsoft.identitymodel.protocols.configurationmanager-1.getconfigurationasync
- Microsoft Learn: `ClientSecretCredential.GetTokenAsync` API reference - https://learn.microsoft.com/en-us/dotnet/api/azure.identity.clientsecretcredential.gettokenasync

## Issues Found
- The Easy Auth sample used a client principal model with `UserId`, `UserDetails`, `Type`, and `Value` properties that do not match the App Service `X-MS-CLIENT-PRINCIPAL` JSON shape. Updated the sample to use `auth_typ`, `name_typ`, `role_typ`, and claims entries with `typ` and `val`, and to read user id/name from the dedicated `x-ms-client-principal-id` and `x-ms-client-principal-name` headers.
- The isolated worker header examples used `GetValues`, which can throw when a header is absent. Updated the samples to use `TryGetValues`, matching the official Azure Functions isolated worker guidance.
- The App Service authentication CLI sample configured the Microsoft provider but did not explicitly enable authentication, and used `RedirectToLoginPage` while describing API-style 401 behavior. Added `--enabled true`, changed the unauthenticated action to `Return401`, and clarified that `RedirectToLoginPage` is appropriate for browser-based flows.
- The app registration command comment said it added an API scope, but `--identifier-uris` sets the Application ID URI. Updated the comment to avoid implying it creates delegated scopes.
- The custom middleware sample called `GetConfigurationAsync()` without the required cancellation token in the current Microsoft.IdentityModel.Protocols API reference. Updated it to pass `CancellationToken.None` and enabled issuer signing key validation.
- The code samples relied on implicit usings for several referenced types. Added the missing namespace imports needed for configuration, logging, JSON attributes, LINQ, and cancellation token usage.
- The client sample was described as MSAL code even though it uses `Azure.Identity`. Updated the text to identify the Azure Identity client library.
- The daemon/client-credentials sample requested `/.default` without noting that application permissions are represented by app roles. Added a short comment that an app role must be configured on the API and granted to the client app.
- The summary referred to Azure RBAC integration, which is not what the sample configures. Updated it to refer to Microsoft Entra app roles and claims.

## Review Notes
The post still uses the older "Azure AD" name. Microsoft now uses "Microsoft Entra ID", but Azure AD remains a common alias in existing content, so this was not treated as a blocking technical issue.
