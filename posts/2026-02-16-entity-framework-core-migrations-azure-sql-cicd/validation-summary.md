# Validation Summary: How to Use Entity Framework Core Migrations with Azure SQL in a CI/CD Pipeline

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Entity Framework Core 8
- .NET 8
- Azure SQL Database
- GitHub Actions
- Azure App Service deployment
- Azure DevOps Pipelines

## Sources Consulted
- Microsoft Learn: Applying Migrations - EF Core: https://learn.microsoft.com/en-us/ef/core/managing-schemas/migrations/applying
- Microsoft Learn: EF Core tools reference (.NET CLI): https://learn.microsoft.com/en-us/ef/core/cli/dotnet
- Microsoft Learn: EF Core releases and planning: https://learn.microsoft.com/en-us/ef/core/what-is-new/
- Microsoft Learn: Deploy to Azure App Service by using GitHub Actions: https://learn.microsoft.com/en-us/azure/app-service/deploy-github-actions
- Microsoft Learn: Publish and download pipeline artifacts - Azure Pipelines: https://learn.microsoft.com/en-us/azure/devops/pipelines/artifacts/pipeline-artifacts
- NuGet Gallery: Microsoft.EntityFrameworkCore.SqlServer versions and target frameworks: https://www.nuget.org/packages/Microsoft.EntityFrameworkCore.SqlServer/

## Issues Found
- The post used `.NET 8 SDK` as the prerequisite but installed EF Core packages and the `dotnet-ef` tool without a version. As of 2026-06-01, the latest stable EF Core line is 10.x and targets .NET 10, so those commands can fail in a .NET 8 project. Updated the package and tool install commands to use the `8.*` version line.
- The GitHub Actions `azure/webapps-deploy@v3` step did not include authentication. Added the `publish-profile` input using the standard `AZURE_WEBAPP_PUBLISH_PROFILE` secret.
- The rollback section said EF Core does not have a built-in rollback mechanism for production. EF Core can generate rollback scripts by specifying a newer `from` migration and older `to` migration, but production rollback is not automatic. Updated the wording to reflect that distinction.

## Review Notes
The migration bundle and idempotent script commands are valid for EF Core 8. The Azure DevOps artifact path is plausible for a deployment job because current pipeline artifacts are downloaded automatically to `$(Pipeline.Workspace)` for deployment lifecycle hooks.
