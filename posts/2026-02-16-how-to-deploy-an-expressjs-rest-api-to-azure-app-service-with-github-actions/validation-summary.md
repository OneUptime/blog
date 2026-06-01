# Validation Summary: How to Deploy an Express.js REST API to Azure App Service with GitHub Actions

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Express.js
- Node.js
- Jest
- Supertest
- Azure App Service
- Azure CLI
- GitHub Actions
- Azure Web Apps Deploy action
- Azure Login action
- Azure App Service deployment slots
- Azure App Service custom domains and TLS/SSL certificates

## Sources Consulted
- Microsoft Learn: Configure Node.js apps for Azure App Service - https://learn.microsoft.com/en-us/azure/app-service/configure-language-nodejs
- Microsoft Learn: Deploy to Azure App Service by using GitHub Actions - https://learn.microsoft.com/en-us/azure/app-service/deploy-github-actions
- Microsoft Learn: Azure CLI `az webapp deployment list-publishing-profiles` - https://learn.microsoft.com/en-us/cli/azure/webapp/deployment
- Microsoft Learn: Azure CLI `az webapp deployment slot create` and `slot swap` - https://learn.microsoft.com/en-us/cli/azure/webapp/deployment/slot
- Microsoft Learn: Set up staging environments in Azure App Service - https://learn.microsoft.com/en-us/azure/app-service/deploy-staging-slots
- Microsoft Learn: Azure App Service plans - https://learn.microsoft.com/en-us/azure/app-service/overview-hosting-plans
- Microsoft Learn: Install a TLS/SSL certificate for Azure App Service - https://learn.microsoft.com/en-us/azure/app-service/configure-ssl-certificate
- Azure Login GitHub Action documentation - https://github.com/Azure/login
- Azure Web Apps Deploy GitHub Action documentation - https://github.com/Azure/webapps-deploy

## Issues Found
- The post created the App Service plan with the Basic B1 tier, then later attempted to create a deployment slot. Azure App Service deployment slots require Standard, Premium, or Isolated tiers. Added an `az appservice plan update --sku S1` command before slot creation.
- The staging deployment workflow referenced `AZURE_WEBAPP_PUBLISH_PROFILE_STAGING` without showing how to get the staging slot publish profile. Added the Azure CLI command with `--slot staging`.
- The slot swap step used Azure CLI without authenticating the workflow to Azure. Added a note about `AZURE_CREDENTIALS` or OIDC and inserted an `azure/login@v3` step before the Azure CLI swap command.
- Updated the Azure CLI GitHub Action from `azure/CLI@v1` to the current documented `azure/cli@v2` action.

## Review Notes
- The Express.js, middleware, REST endpoint, Jest/Supertest, App Service startup command, publish-profile deployment, slot-name deployment input, custom domain, and TLS/SSL snippets are technically consistent with current documentation.
- The Azure CLI was not installed in the local workspace, so Azure CLI command verification was performed against official Microsoft Learn documentation rather than local `az --help` output.
