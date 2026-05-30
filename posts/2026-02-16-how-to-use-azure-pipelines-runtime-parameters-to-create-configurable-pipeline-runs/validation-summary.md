# Validation Summary: Use Azure Pipelines Runtime Parameters to Create Configurable Pipeline Runs

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Pipelines YAML
- Azure Pipelines runtime parameters
- Azure Pipelines template expressions and conditions
- Azure CLI
- Azure Resource Manager / Bicep deployments
- Azure App Service app settings
- Docker CLI

## Sources Consulted
- Microsoft Learn: Runtime parameters for Azure Pipelines - https://learn.microsoft.com/en-us/azure/devops/pipelines/process/runtime-parameters?view=azure-devops
- Microsoft Learn: Azure Pipelines parameter schema - https://learn.microsoft.com/en-us/azure/devops/pipelines/yaml-schema/parameters-parameter?view=azure-pipelines
- Microsoft Learn: Azure Pipelines conditions - https://learn.microsoft.com/en-us/azure/devops/pipelines/process/conditions?view=azure-devops
- Microsoft Learn: Azure Pipelines template expressions - https://learn.microsoft.com/en-us/azure/devops/pipelines/process/template-expressions?view=azure-devops
- Microsoft Learn: Azure Pipelines stage schema - https://learn.microsoft.com/en-us/azure/devops/pipelines/yaml-schema/stages-stage?view=azure-pipelines
- Microsoft Learn: Run Pipeline REST API - https://learn.microsoft.com/en-us/rest/api/azure/devops/pipelines/runs/run-pipeline?view=azure-devops-rest-7.1
- Microsoft Learn: Azure CLI `az deployment group` - https://learn.microsoft.com/en-us/cli/azure/deployment/group?view=azure-cli-latest
- Microsoft Learn: Azure CLI `az webapp config appsettings` - https://learn.microsoft.com/en-us/cli/azure/webapp/config/appsettings?view=azure-cli-latest

## Issues Found
- The post stated that Azure Pipelines has no native multi-select parameter type. Current Azure Pipelines documentation lists `stringList` as a runtime parameter type for multi-select values, with the caveat that it is not available in templates. I updated the type list, revised the multi-select section to use `stringList`, and kept the template caveat.
- The configurable release pipeline could allow later stages to start too early when intermediate optional stages were disabled. I updated the conditional `dependsOn` entries so API, frontend, and post-deploy stages depend on the latest enabled predecessor.

## Review Notes
- The Azure CLI command shapes for resource group deployments and App Service app settings match current Azure CLI documentation.
- The REST API note is technically correct; Azure DevOps Run Pipeline accepts `templateParameters` in the request body.
- Parameters should not be used for secrets because they are expanded during template parsing and can be exposed in generated YAML or logs. The post does not recommend using parameters for secrets.
