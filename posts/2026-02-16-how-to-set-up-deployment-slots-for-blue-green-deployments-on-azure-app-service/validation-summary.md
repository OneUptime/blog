# Validation Summary: How to Set Up Deployment Slots for Blue-Green Deployments on Azure App Service

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure App Service
- Azure App Service deployment slots
- Azure CLI
- GitHub Actions
- App Service traffic routing
- App Service slot swap warm-up configuration

## Sources Consulted
- Microsoft Learn: Set up staging environments in Azure App Service - https://learn.microsoft.com/en-us/azure/app-service/deploy-staging-slots
- Microsoft Learn: az webapp deployment slot CLI reference - https://learn.microsoft.com/en-us/cli/azure/webapp/deployment/slot
- Microsoft Learn: az webapp config appsettings CLI reference - https://learn.microsoft.com/en-us/cli/azure/webapp/config/appsettings
- Microsoft Learn: az webapp config CLI reference - https://learn.microsoft.com/en-us/cli/azure/webapp/config
- Microsoft Learn: az webapp traffic-routing CLI reference - https://learn.microsoft.com/en-us/cli/azure/webapp/traffic-routing
- Microsoft Learn: Environment variables and app settings in Azure App Service - https://learn.microsoft.com/en-us/azure/app-service/reference-app-settings
- Azure/webapps-deploy GitHub Action documentation - https://github.com/Azure/webapps-deploy
- Azure CLI appservice command source for app settings parsing - https://github.com/Azure/azure-cli/blob/dev/src/azure-cli/azure/cli/command_modules/appservice/custom.py

## Issues Found
- The slot-sticky app settings examples passed bare setting names to `--slot-settings`. Current Azure CLI parsing expects `KEY=VALUE` assignments for `az webapp config appsettings set --slot-settings`, so the examples were changed to set the sticky values directly.
- The auto-swap example used `az webapp config set --auto-swap-slot-name`, but the current Azure CLI reference exposes auto-swap through `az webapp deployment slot auto-swap`. The command was updated accordingly.
- The slot warm-up snippet was shown as JSON even though App Service custom warm-up via `applicationInitialization` is configured as a `web.config` XML fragment. The snippet was replaced with a valid XML example.
- The Linux warm-up wording implied only an unconditional root-path request. It was updated to mention that `/` is the default swap warm-up path and that `WEBSITE_SWAP_WARMUP_PING_PATH` can override it.

## Review Notes
The Azure CLI was not installed in the local workspace, so CLI validation was performed against current Microsoft Learn CLI reference pages and the Azure CLI appservice command source. The GitHub Actions example is structurally plausible, but real deployments still require correctly scoped Azure credentials or publish profile configuration for the target app and slot.
