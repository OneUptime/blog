# Validation Summary: How to Set Up Staging Environments and Swap Slots in Azure App Service

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure App Service
- Azure App Service deployment slots
- Azure CLI
- Slot swaps and swap with preview
- App Service app settings and slot-specific settings
- App Service traffic routing
- IIS `web.config` application initialization

## Sources Consulted
- Microsoft Learn: Set up staging environments in Azure App Service: https://learn.microsoft.com/en-us/azure/app-service/deploy-staging-slots
- Microsoft Learn: Azure CLI `az webapp deployment slot`: https://learn.microsoft.com/en-gb/cli/azure/webapp/deployment/slot?view=azure-cli-latest
- Microsoft Learn: Configure an App Service app: https://learn.microsoft.com/en-us/azure/app-service/configure-common
- Microsoft Learn: Azure CLI `az webapp config container`: https://learn.microsoft.com/en-us/cli/azure/webapp/config/container?view=azure-cli-latest
- Microsoft Learn: Azure CLI `az webapp deployment source`: https://learn.microsoft.com/en-us/cli/azure/webapp/deployment/source?view=azure-cli-latest
- Microsoft Learn: Azure App Service app settings reference: https://learn.microsoft.com/en-us/azure/app-service/reference-app-settings
- Microsoft Learn: Azure subscription and service limits, quotas, and constraints: https://learn.microsoft.com/en-us/azure/azure-resource-manager/management/azure-subscription-service-limits

## Issues Found
- Corrected the `az webapp config appsettings set` sticky-settings example. The command must set values with `--settings` and pass setting names to `--slot-settings`; using `--slot-settings` with `KEY=value` entries is not the documented CLI syntax.
- Clarified that a swap does more than only change routing. Azure prepares and warms the source slot before switching routing, but it does not redeploy the code.
- Added `--action swap` to the second phase of the swap-with-preview example to match the documented completion command.
- Corrected the traffic-routing cookie behavior. App Service pins automatically routed clients for one hour or until cookies are deleted, not necessarily for the whole browser session.
- Corrected custom domain wording. Custom domains are not swapped during slot swaps.

## Review Notes
The Azure CLI was not installed in the local environment, so command validation was performed against current official Microsoft Learn Azure CLI documentation rather than local `az --help` output.
