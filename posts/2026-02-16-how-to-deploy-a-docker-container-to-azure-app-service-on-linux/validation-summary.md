# Validation Summary: How to Deploy a Docker Container to Azure App Service on Linux

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure App Service on Linux
- Azure Container Registry
- Azure CLI
- Docker and Dockerfile syntax
- Node.js container deployment
- Managed identities
- App Service app settings and container logging
- ACR webhooks and container continuous deployment

## Sources Consulted
- Microsoft Learn: Tutorial: Build and Run a Custom Image in Azure App Service - https://learn.microsoft.com/en-us/azure/app-service/tutorial-custom-container
- Microsoft Learn: Azure App Service on Linux FAQ - https://learn.microsoft.com/en-us/troubleshoot/azure/app-service/faqs-app-service-linux-new
- Microsoft Learn: az webapp config - https://learn.microsoft.com/en-us/cli/azure/webapp/config
- Microsoft Learn: az webapp config container - https://learn.microsoft.com/en-us/cli/azure/webapp/config/container
- Microsoft Learn: az webapp deployment container - https://learn.microsoft.com/en-us/cli/azure/webapp/deployment/container
- Microsoft Learn: az acr - https://learn.microsoft.com/en-us/cli/azure/acr
- Microsoft Learn: Azure Container Registry naming guidance - https://learn.microsoft.com/en-us/azure/aks/tutorial-kubernetes-prepare-acr
- Docker Docs: Dockerfile reference - https://docs.docker.com/reference/builder
- Docker Docs: Multi-stage builds - https://docs.docker.com/build/building/multi-stage/
- npm Docs: npm ci - https://docs.npmjs.com/cli/commands/npm-ci/

## Issues Found
- The post said Azure App Service expects custom containers to listen on port 8080 by default. Microsoft documentation says custom containers can be automatically detected on port 80 or 8080, and `WEBSITES_PORT` should be set for other ports. Updated both the Dockerfile comment and the Port Configuration section.
- The ACR setup comment said enabling the admin user is needed for App Service to pull images. That is only needed for the username/password credential approach, not for managed identity. Updated the comment to avoid implying admin credentials are required.
- The managed identity configuration used the generic `acrUseManagedIdentityCreds` JSON configuration. Azure CLI now documents dedicated `az webapp config set` flags for this path. Updated the command to use `--acr-use-identity true` and `--acr-identity [system]`.

## Review Notes
The Azure CLI commands and Dockerfile structure are otherwise consistent with current official documentation. The local environment did not have Azure CLI installed, so CLI verification was performed against Microsoft Learn command reference pages rather than local `az --help` output.
