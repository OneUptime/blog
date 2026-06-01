# Validation Summary: How to Deploy an ASP.NET Core Web API to Azure App Service with Managed Identity

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure App Service
- ASP.NET Core Web API
- .NET 8
- Azure managed identities
- Azure Key Vault
- Azure SQL Database
- Microsoft.Data.SqlClient
- Entity Framework Core
- Azure CLI
- GitHub Actions
- Application Insights

## Sources Consulted
- Microsoft Learn: Azure Key Vault configuration provider in ASP.NET Core - https://learn.microsoft.com/en-us/aspnet/core/security/key-vault-configuration
- Microsoft Learn: Use managed identities for App Service and Azure Functions - https://learn.microsoft.com/en-us/azure/app-service/overview-managed-identity
- Microsoft Learn: Connect to Azure SQL with Microsoft Entra authentication and SqlClient - https://learn.microsoft.com/en-us/sql/connect/ado-net/sql/azure-active-directory-authentication
- Microsoft Learn: Configure Microsoft Entra authentication with Azure SQL - https://learn.microsoft.com/en-us/azure/azure-sql/database/authentication-aad-configure
- Microsoft Learn: Azure Key Vault RBAC guide - https://learn.microsoft.com/en-us/azure/key-vault/general/rbac-guide
- Microsoft Learn: Azure built-in roles for Security - https://learn.microsoft.com/en-us/azure/role-based-access-control/built-in-roles/security
- Microsoft Learn: az appservice plan - https://learn.microsoft.com/en-us/cli/azure/appservice/plan
- Microsoft Learn: az webapp config appsettings - https://learn.microsoft.com/en-us/cli/azure/webapp/config/appsettings
- Microsoft Learn: az sql server firewall-rule - https://learn.microsoft.com/en-us/cli/azure/sql/server/firewall-rule
- Microsoft Learn: Set up staging environments in Azure App Service - https://learn.microsoft.com/en-us/azure/app-service/deploy-staging-slots
- Microsoft Learn: Automatic scaling in Azure App Service - https://learn.microsoft.com/en-us/azure/app-service/manage-automatic-scaling

## Issues Found
- The ASP.NET Core code used `AddAzureKeyVault` without showing the required `Azure.Extensions.AspNetCore.Configuration.Secrets` package and namespace. Added the package installation command and `using Azure.Extensions.AspNetCore.Configuration.Secrets;`.
- The package dependencies for Azure Identity, Key Vault secrets, and EF Core SQL Server were not shown, so the sample would not compile from a fresh Web API project. Added the required `dotnet add package` commands.
- The introductory managed identity claim said there were no connection strings to manage, but Azure SQL still requires a non-secret connection string containing server, database, and authentication mode. Changed the wording to "secret-bearing connection strings."
- The Azure SQL creation comment incorrectly said the SQL server was created with an Azure AD admin. The Microsoft Entra admin is configured later with `az sql server ad-admin create`, so the comment was corrected.
- The resource setup omitted Azure SQL firewall configuration. Added an Azure SQL firewall rule allowing Azure-internal addresses so the App Service can reach the database in the public-network example.
- The Key Vault was created with Azure RBAC enabled, but the signed-in user was not granted data-plane permission before running `az keyvault secret set`. Added a `Key Vault Secrets Officer` role assignment for the signed-in user before storing initial secrets.

## Review Notes
- The deployment section uses a GitHub publish profile secret, which is a deployment credential rather than an application runtime secret. For a future improvement, the workflow could use federated identity/OIDC to avoid storing a publish profile in GitHub.
- The deployment slot example is valid only after scaling the App Service plan to a tier that supports slots, such as Standard or Premium. The post scales to `P1v3` before the slot section, so the sequence is technically valid.
- Local verification with `az` and `dotnet` was not possible because neither CLI is installed in this environment; command and API validation was performed against official Microsoft documentation.
