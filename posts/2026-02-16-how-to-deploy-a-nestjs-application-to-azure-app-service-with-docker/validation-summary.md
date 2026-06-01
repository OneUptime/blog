# Validation Summary: How to Deploy a NestJS Application to Azure App Service with Docker

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- NestJS
- Azure App Service for Containers
- Azure Container Registry
- Azure CLI
- Docker
- Node.js
- TypeScript
- GitHub Actions

## Sources Consulted
- NestJS validation documentation: https://docs.nestjs.com/techniques/validation
- NestJS Fastify documentation: https://docs.nestjs.com/techniques/performance
- Microsoft Learn, custom containers in Azure App Service: https://learn.microsoft.com/en-us/azure/app-service/configure-custom-container
- Microsoft Learn, Azure App Service on Linux FAQ: https://learn.microsoft.com/en-us/troubleshoot/azure/app-service/faqs-app-service-linux-new
- Microsoft Learn, Azure App Service custom container tutorial: https://learn.microsoft.com/en-us/azure/app-service/tutorial-custom-container
- Microsoft Learn, custom container CI/CD in Azure App Service: https://learn.microsoft.com/en-us/azure/app-service/deploy-ci-cd-custom-container
- Microsoft Learn, App Service Health check: https://learn.microsoft.com/en-us/azure/app-service/monitor-instances-health-check
- Microsoft Learn, Azure CLI `az webapp config container`: https://learn.microsoft.com/en-us/cli/azure/webapp/config/container
- Microsoft Learn, Azure CLI `az webapp deployment container`: https://learn.microsoft.com/en-us/cli/azure/webapp/deployment/container
- Microsoft Learn, Azure Container Registry authentication: https://learn.microsoft.com/en-us/azure/container-registry/container-registry-authentication
- Docker Dockerfile reference: https://docs.docker.com/reference/builder
- Docker build context and `.dockerignore` documentation: https://docs.docker.com/build/building/context/
- Azure Login GitHub Action repository: https://github.com/Azure/login

## Issues Found
- The NestJS setup installed `@nestjs/config`, `class-validator`, and `class-transformer`, but the service imported `uuid` without installing it. Added `uuid` to the dependency installation command so the sample compiles.
- The Azure deployment commands configured a private ACR image without giving App Service permission to pull from the registry. Added managed identity setup, an `AcrPull` role assignment, and the App Service `acrUseManagedIdentityCreds` configuration.
- The continuous deployment command enabled App Service container CD but did not create the ACR webhook. Updated the commands to capture the CI/CD webhook URL and create an ACR webhook scoped to `task-manager:v1`.
- The `WEBSITES_PORT` explanation said the setting must match only `EXPOSE`. Clarified that it must match the application listening port and the Dockerfile `EXPOSE` metadata.
- The wrap-up said the Docker health check ensures App Service knows when the container is ready. Adjusted the wording because App Service Health check uses a configured path in the app, not the Dockerfile `HEALTHCHECK` instruction alone.
- The GitHub Actions workflow used `azure/login@v1`. Updated it to `azure/login@v2`, matching current Microsoft Learn examples for Azure App Service GitHub Actions workflows.

## Review Notes
- The Azure CLI is not installed in this local workspace, so CLI validation was performed against Microsoft Learn reference documentation rather than local `az --help` output.
- The in-memory task store is acceptable for a tutorial sample, and the post correctly notes that production deployments should use a database.
- App Service Health check still needs to be enabled for a production app, using `/health` as the configured path.
