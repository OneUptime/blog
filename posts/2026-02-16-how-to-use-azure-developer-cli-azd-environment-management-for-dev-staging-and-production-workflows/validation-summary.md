# Validation Summary: How to Use Azure Developer CLI Environment Management for Dev, Staging,

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Developer CLI (azd)
- azd environments and environment variables
- Azure Bicep
- Azure App Service
- Azure Monitor Application Insights and Log Analytics
- Azure CLI
- Azure Pipelines YAML

## Sources Consulted
- Microsoft Learn: Azure Developer CLI reference - https://learn.microsoft.com/en-us/azure/developer/azure-developer-cli/reference
- Microsoft Learn: Work with Environments in Azure Developer CLI - https://learn.microsoft.com/en-us/azure/developer/azure-developer-cli/work-with-environments
- Microsoft Learn: Work with Azure Developer CLI environment variables - https://learn.microsoft.com/en-us/azure/developer/azure-developer-cli/manage-environment-variables
- Microsoft Learn: Customize Azure Developer CLI workflows using command and event hooks - https://learn.microsoft.com/en-us/azure/developer/azure-developer-cli/azd-extensibility
- Microsoft Learn: Azure CLI az webapp config backup - https://learn.microsoft.com/en-us/cli/azure/webapp/config/backup
- Microsoft Learn: Microsoft.Web/sites template reference - https://learn.microsoft.com/en-us/azure/templates/microsoft.web/2024-04-01/sites

## Issues Found
- The setup example manually set `AZURE_ENV_NAME`. azd creates and manages this value for the selected environment, so the redundant assignment was removed.
- The multi-environment setup relied on `azd env new` implicitly selecting the new environment. Because azd can prompt when environments already exist, explicit `azd env select` commands were added for staging and production, and the sample `azd env list` output was updated accordingly.
- The Bicep Web App example used a Linux App Service plan but did not mark the site as a Linux app or set a Linux runtime stack. Added `kind: 'app,linux'` and `linuxFxVersion: 'PYTHON|3.11'`.
- The production hook used `az webapp create-snapshot`, which is not a valid Azure CLI command. Replaced it with the documented `az webapp config backup create` command and its required container SAS URL parameter.
- The teardown example used `azd env delete`, but the current azd reference documents `azd env remove`. Updated the command.
- The `azd env refresh` guidance implied it syncs arbitrary manual Azure resource changes. Updated the wording to match the documented behavior: it refreshes local environment values from previous infrastructure deployment outputs and does not redeploy or reconcile arbitrary changes.

## Review Notes
azd was not installed in the local environment, so CLI validation was performed against current Microsoft Learn command references rather than local `--help` output.
