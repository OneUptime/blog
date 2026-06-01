# Validation Summary: How to Configure Health Check Endpoints for Azure App Service

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure App Service Health check
- Azure CLI
- ARM templates for Microsoft.Web/sites
- Azure Monitor metric alerts
- ASP.NET Core controllers and Health Checks middleware
- ADO.NET database connectivity
- Node.js and Express

## Sources Consulted
- Microsoft Learn: Monitor App Service instances by using Health check: https://learn.microsoft.com/en-us/azure/app-service/monitor-instances-health-check
- Microsoft Learn: Azure CLI `az webapp config set`: https://learn.microsoft.com/en-us/cli/azure/webapp/config
- Microsoft Learn: Azure CLI `az monitor metrics alert create`: https://learn.microsoft.com/en-us/cli/azure/monitor/metrics/alert
- Microsoft Learn: ARM template reference for `Microsoft.Web/sites/config` and `healthCheckPath`: https://learn.microsoft.com/en-us/azure/templates/microsoft.web/sites/config-web
- Microsoft Learn: Health checks in ASP.NET Core: https://learn.microsoft.com/en-us/aspnet/core/host-and-deploy/health-checks
- Microsoft Learn: `DbConnection.OpenAsync`: https://learn.microsoft.com/en-us/dotnet/api/system.data.common.dbconnection.openasync
- Microsoft Learn: `SqlCommand.ExecuteScalarAsync`: https://learn.microsoft.com/en-us/dotnet/api/system.data.sqlclient.sqlcommand.executescalarasync
- Node.js API docs: `fetch` and `AbortSignal.timeout`: https://nodejs.org/api/globals.html
- Express documentation: Routing and `express.Router`: https://expressjs.com/en/guide/routing.html

## Issues Found
- Clarified Azure App Service Health check removal and replacement behavior. The original text implied every unhealthy instance is always removed and replaced after one hour. Microsoft documents a configurable unhealthy-instance percentage limit, a default threshold of 10 failed pings, and replacement limits at the App Service plan level.
- Corrected the recovery status-code wording from "returning 200" to any 200-299 response, matching Azure App Service Health check behavior.
- Fixed the manual ASP.NET Core database example to use `DbConnection` instead of `IDbConnection` for async `OpenAsync` and `ExecuteScalarAsync` usage. `IDbCommand` does not expose `ExecuteScalarAsync`.
- Changed the cache example so it does not claim to perform a connectivity check when it only reads configuration. It now verifies that the configured cache host value exists.
- Added a package caveat for ASP.NET Core SQL Server, Redis, and URL health check extension methods. `AddHealthChecks` and `MapHealthChecks` are built in, but those dependency-specific checks come from provider packages.
- Corrected the health check timeout description. Azure documentation says a ping is considered unhealthy if the path does not return within one minute, not "a few seconds."
- Corrected the authentication guidance. Health check integrates with App Service authentication/authorization; when using custom authentication, the endpoint should allow anonymous access or validate App Service's `x-ms-auth-internal-token` header.
- Adjusted optional dependency guidance so it does not incorrectly state that all instances are pulled from rotation during a shared dependency outage. Azure keeps routing when all instances are unhealthy.
- Removed an unsupported claim that existing connections are allowed to complete, replacing it with documented routing behavior around the unhealthy-instance percentage limit.

## Review Notes
The Azure CLI examples and ARM property names match the official references, but the Azure CLI is not installed in this workspace, so command validation was performed against Microsoft Learn rather than local `az --help`. The sample code remains illustrative and assumes normal ASP.NET Core imports, dependency registration, and package installation.
