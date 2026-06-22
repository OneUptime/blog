# Validation Summary: How to Handle Azure App Service Deployment

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Azure App Service
- Azure CLI
- Local Git deployment
- ZIP deployment and Kudu ZIP deploy API
- GitHub Actions
- OpenID Connect authentication for Azure deployments
- Azure Container Registry
- Managed identities
- Docker and Docker Compose on App Service
- App Service deployment slots
- App Service application settings, connection strings, health checks, logs, and auto-heal

## Sources Consulted
- Microsoft Learn: Deploy files to Azure App Service - https://learn.microsoft.com/en-us/azure/app-service/deploy-zip
- Microsoft Learn: Deploy from a local Git repository to Azure App Service - https://learn.microsoft.com/en-us/azure/app-service/deploy-local-git
- Microsoft Learn: Manage deployment credentials for Azure App Service - https://learn.microsoft.com/en-us/azure/app-service/deploy-configure-credentials
- Microsoft Learn: Deploy to Azure App Service by using GitHub Actions - https://learn.microsoft.com/en-us/azure/app-service/deploy-github-actions
- Microsoft Learn: Configure a custom container for Azure App Service - https://learn.microsoft.com/en-us/azure/app-service/configure-custom-container
- Microsoft Learn: Migrate Docker Compose apps to sidecars in Azure App Service - https://learn.microsoft.com/en-us/azure/app-service/migrate-sidecar-multi-container-apps
- Microsoft Learn: Set up staging environments in Azure App Service - https://learn.microsoft.com/en-us/azure/app-service/deploy-staging-slots
- Microsoft Learn: Monitor App Service instances using Health check - https://learn.microsoft.com/en-us/azure/app-service/monitor-instances-health-check
- Microsoft Learn: Environment variables and app settings in Azure App Service - https://learn.microsoft.com/en-us/azure/app-service/reference-app-settings
- Microsoft Learn: Azure CLI az webapp reference - https://learn.microsoft.com/en-us/cli/azure/webapp
- Microsoft Learn: Azure CLI az webapp config reference - https://learn.microsoft.com/en-us/cli/azure/webapp/config
- Microsoft Learn: Azure CLI az webapp config appsettings reference - https://learn.microsoft.com/en-us/cli/azure/webapp/config/appsettings
- Microsoft Learn: Azure CLI az webapp config connection-string reference - https://learn.microsoft.com/en-us/cli/azure/webapp/config/connection-string
- Microsoft Learn: Azure CLI az webapp config container reference - https://learn.microsoft.com/en-us/cli/azure/webapp/config/container
- Microsoft Learn: Azure CLI az webapp deployment reference - https://learn.microsoft.com/en-us/cli/azure/webapp/deployment
- Microsoft Learn: Azure CLI az webapp deployment container reference - https://learn.microsoft.com/en-us/cli/azure/webapp/deployment/container
- Microsoft Learn: Azure CLI az webapp log reference - https://learn.microsoft.com/en-us/cli/azure/webapp/log

## Issues Found
- Local Git deployment examples pushed to `main`, but App Service local Git still uses `master` as the default deployment branch unless `DEPLOYMENT_BRANCH` is configured. Added an app setting command to set `DEPLOYMENT_BRANCH=main`.
- The Local Git publishing credential note implied that `scmUri` always includes `/myapp.git`. Microsoft documentation notes the returned URI may not include the repository suffix. Updated the comment to append `/myapp.git` if needed.
- The container creation example used deprecated `--deployment-container-image-name`. Replaced it with current `--container-image-name`.
- The ACR managed identity flow granted `AcrPull` but did not configure App Service to use the identity for image pulls. Added `az webapp config set --acr-use-identity true --acr-identity '[system]'`.
- The Docker Compose section did not mention the App Service Docker Compose retirement date. Added the current retirement note and sidecar guidance.
- The Docker Compose example used `${DATABASE_URL}` substitution, but App Service Docker Compose does not support default environment-variable substitution in the same way as Docker Compose. Replaced it with an explicit placeholder connection string value.
- The slot-specific connection string example used an invalid `name=value` shape. Changed it to `DefaultConnection=...`.
- The troubleshooting section said `az webapp restart` restarts the Kudu service. It restarts the app, including the SCM/Kudu site, so the wording was corrected.
- The source-control sync troubleshooting command was presented as a general old-code fix. Clarified that it applies to manual source-control integration.
- The container log command used invalid `az webapp log show --docker-container` syntax. Replaced it with supported Docker container log configuration and `az webapp log tail`.

## Review Notes
Azure CLI was not installed in the local workspace, so command validation was performed against current Microsoft Learn CLI references rather than local `az --help` output. The GitHub Actions examples are syntactically valid, but for compiled Node.js applications the deployed `package` path should usually point to the built output folder, as Microsoft notes in its App Service GitHub Actions guidance.
