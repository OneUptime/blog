# Validation Summary: How to Configure Microsoft Entra ID App Registration with API Permissions

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Microsoft Entra ID
- Microsoft Graph
- Microsoft Graph PowerShell SDK
- OAuth 2.0 client credentials flow
- Microsoft Identity Client (MSAL) for .NET
- C#
- PowerShell
- Azure Monitor / Log Analytics KQL

## Sources Consulted
- Microsoft identity platform scopes and permissions: https://learn.microsoft.com/en-us/entra/identity-platform/scopes-oidc
- Microsoft identity platform daemon token acquisition: https://learn.microsoft.com/en-us/entra/identity-platform/scenario-daemon-acquire-token
- Microsoft Graph permissions overview: https://learn.microsoft.com/en-us/graph/permissions-overview
- Microsoft Graph permissions reference: https://learn.microsoft.com/en-us/graph/permissions-reference
- Grant tenant-wide admin consent to an application: https://learn.microsoft.com/en-us/azure/active-directory/manage-apps/grant-admin-consent
- Microsoft Entra built-in roles reference: https://learn.microsoft.com/en-us/entra/identity/role-based-access-control/permissions-reference
- New-MgServicePrincipalAppRoleAssignment documentation: https://learn.microsoft.com/en-us/powershell/module/microsoft.graph.applications/new-mgserviceprincipalapproleassignment
- keyCredential resource type: https://learn.microsoft.com/en-us/graph/api/resources/keycredential
- MSAL .NET WithCertificate documentation: https://learn.microsoft.com/en-us/dotnet/api/microsoft.identity.client.confidentialclientapplicationbuilder.withcertificate
- MSAL .NET AcquireTokenForClient documentation: https://learn.microsoft.com/en-us/dotnet/api/microsoft.identity.client.iconfidentialclientapplication.acquiretokenforclient
- Microsoft identity platform access token lifetime documentation: https://learn.microsoft.com/en-us/entra/identity-platform/access-tokens
- AADServicePrincipalSignInLogs table reference: https://learn.microsoft.com/en-us/azure/azure-monitor/reference/tables/aadserviceprincipalsigninlogs

## Issues Found
- The prerequisites said Application Administrator or Global Administrator was sufficient for the full walkthrough. Microsoft Graph application permissions require a more privileged administrator for consent, so the prerequisites now distinguish app management roles from Privileged Role Administrator or Global Administrator for Microsoft Graph application permission consent.
- The PowerShell connection scope only requested `Application.ReadWrite.All`. Granting app role assignments with `New-MgServicePrincipalAppRoleAssignment` also requires `AppRoleAssignment.ReadWrite.All`, so the example now requests both scopes.
- The certificate upload example used `KeyCredential` as a singular request property. Microsoft Graph application objects use the `keyCredentials` collection, so the example now sends `keyCredentials` with certificate metadata and explicit start/end dates.
- The C# certificate comment said the certificate was loaded from the certificate store, but the code loads a PFX file. The comment now matches the code.
- The KQL example counted failures with `ResultType != "0"`. The current `AADServicePrincipalSignInLogs` table documents `ResultType` as values such as `Success` and `Failure`, so the query now uses `ResultType != "Success"`.
- The token caching section said access tokens are typically valid for one hour. Microsoft documents the default access token lifetime as variable, typically 60 to 90 minutes, so the text now reflects that range.

## Review Notes
The post is technically relevant and the overall flow is correct: use application permissions for app-only access, request `{resource}/.default` in client credentials flow, and grant admin consent before using Microsoft Graph application roles. The PowerShell certificate example is Windows-oriented because it uses `New-SelfSignedCertificate` and the Windows certificate provider.
