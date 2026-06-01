# Validation Summary: How to Use Dapper with Azure SQL Database

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapper
- Azure SQL Database
- Managed identities for Azure resources
- Microsoft Entra authentication
- Azure CLI
- C#
- .NET 8
- Microsoft.Data.SqlClient
- Azure.Identity

## Sources Consulted
- Microsoft Learn: Connect to Azure SQL with Microsoft Entra authentication and SqlClient: https://learn.microsoft.com/en-us/sql/connect/ado-net/sql/azure-active-directory-authentication
- Microsoft Learn: SqlConnection.AccessToken property: https://learn.microsoft.com/en-us/dotnet/api/microsoft.data.sqlclient.sqlconnection.accesstoken
- Microsoft Learn: Managed identities in Microsoft Entra for Azure SQL: https://learn.microsoft.com/en-us/azure/azure-sql/database/authentication-azure-ad-user-assigned-managed-identity
- Microsoft Learn: Managed identities for Azure App Service: https://learn.microsoft.com/en-us/azure/app-service/overview-managed-identity
- Microsoft Learn: az sql server ad-admin: https://learn.microsoft.com/en-us/cli/azure/sql/server/ad-admin
- Microsoft Learn: Developer introduction and guidelines for managed identities: https://learn.microsoft.com/en-us/entra/identity/managed-identities-azure-resources/overview-for-developers
- Microsoft Learn: Azure Identity client library for .NET: https://learn.microsoft.com/en-us/dotnet/api/overview/azure/identity-readme
- Dapper GitHub repository: https://github.com/DapperLib/Dapper

## Issues Found
- The original connection factory set `SqlConnection.AccessToken` directly and manually cached the token. Current Microsoft.Data.SqlClient documentation warns that `AccessToken` becomes part of the connection pool key and recommends `AccessTokenCallback` for custom token acquisition because it allows token refresh within the connection pool. I changed the sample to reuse a single `AccessTokenCallback` instance that returns `SqlAuthenticationToken` values from `DefaultAzureCredential`.
- The original text described the database administrator only as the Azure AD admin. Microsoft documentation now uses Microsoft Entra terminology while the Azure CLI command still uses `ad-admin`, so I updated the wording to "Microsoft Entra admin (Azure AD admin in the Azure CLI)".
- The registration and wrap-up text said manual token caching made the singleton factory efficient. After switching to `AccessTokenCallback`, I updated the wording to explain that the singleton reuses the credential and callback so SqlClient can preserve connection pooling and refresh tokens correctly.

## Review Notes
The Azure CLI could not be executed in this workspace because `az` is not installed, and the C# snippets could not be compiled locally because `dotnet` is not installed. Commands and APIs were checked against official documentation instead. The post remains a focused tutorial and is technically valid after the edits.
