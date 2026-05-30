# Validation Summary: How to Set Up Azure Pipelines Release Annotations

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Pipelines
- AzureCLI@2 pipeline task
- Azure Monitor Application Insights
- Application Insights release annotations
- Azure Resource Manager REST API
- Azure CLI `az rest`
- Bash
- Python `requests`
- `jq`

## Sources Consulted
- Microsoft Learn: Application Insights release annotations, https://learn.microsoft.com/en-us/azure/azure-monitor/app/failures-performance-transactions#release-annotations
- Microsoft Learn: Azure CLI `az rest`, https://learn.microsoft.com/en-us/cli/azure/reference-index?view=azure-cli-latest#az-rest
- Microsoft Learn: Azure CLI `az monitor app-insights component`, https://learn.microsoft.com/en-us/cli/azure/monitor/app-insights/component?view=azure-cli-latest
- Microsoft Learn: Azure Pipelines `AzureCLI@2` task, https://learn.microsoft.com/en-us/azure/devops/pipelines/tasks/reference/azure-cli-v2?view=azure-pipelines
- Microsoft Learn: Azure SDK for .NET `CreateAnnotations`, https://learn.microsoft.com/en-us/dotnet/api/azure.resourcemanager.applicationinsights.applicationinsightscomponentresource.createannotations?view=azure-dotnet
- Microsoft Learn: Azure SDK for JavaScript Application Insights `Annotation` interface, https://learn.microsoft.com/en-us/javascript/api/@azure/arm-appinsights/annotation?view=azure-node-preview
- Microsoft Learn: Azure SDK for Python Application Insights `AnnotationsOperations`, https://learn.microsoft.com/en-us/python/api/azure-mgmt-applicationinsights/azure.mgmt.applicationinsights.v2015_05_01.operations.annotationsoperations?view=azure-python

## Issues Found
- The post claimed a built-in Azure DevOps release annotation task was being used, but the example used `AzureCLI@2`. Updated the heading and explanation to match the actual implementation.
- The post used nonexistent current Azure CLI commands: `az monitor app-insights component create-annotation` and `az monitor app-insights component show-annotations`. Replaced those examples with `az rest` calls to the documented ARM annotations endpoint.
- The Python REST example used an older Application Insights API-key endpoint and sent the annotation as an array. Updated it to use the ARM endpoint, a Microsoft Entra bearer token, and a single annotation object.
- The post implied annotations appear on any Application Insights chart. Microsoft documentation says release annotations are shown in Performance and Failures, Usage, and Workbooks time-series visualizations, and not in the Metrics pane. Updated the wording and viewing instructions.
- The opening sentence described a "drop in response time" as an investigation trigger. Changed it to "increase in response time" to match the performance-regression context.

## Review Notes
The corrected examples assume the Azure Pipelines service connection has permission to create annotations on the target Application Insights component through Azure Resource Manager. The `jq` examples also assume `jq` is available on the agent image.
