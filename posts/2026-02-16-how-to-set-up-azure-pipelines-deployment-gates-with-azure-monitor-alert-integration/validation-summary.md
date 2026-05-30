# Validation Summary: How to Set Up Azure Pipelines Deployment Gates

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Pipelines classic release gates
- Azure Monitor alerts
- Azure CLI
- Azure App Service metrics
- Azure Functions
- Python

## Sources Consulted
- Microsoft Learn: Deployment gates concepts - https://learn.microsoft.com/en-us/azure/devops/pipelines/release/approvals/gates?view=azure-devops
- Microsoft Learn: Release gates and approvals overview - https://learn.microsoft.com/en-us/azure/devops/pipelines/release/approvals/?view=azure-devops
- Microsoft Learn: AzureMonitor@1 - Query Azure Monitor alerts task - https://learn.microsoft.com/en-us/azure/devops/pipelines/tasks/reference/azure-monitor-v1?view=azure-pipelines
- Microsoft Learn: AzureFunction@1 - Invoke Azure Function task - https://learn.microsoft.com/en-us/azure/devops/pipelines/tasks/reference/azure-function-v1?view=azure-pipelines
- Microsoft Learn: InvokeRESTAPI@1 - Invoke REST API task - https://learn.microsoft.com/en-us/azure/devops/pipelines/tasks/reference/invoke-rest-api-v1?view=azure-pipelines
- Microsoft Learn: az monitor metrics alert CLI reference - https://learn.microsoft.com/en-us/cli/azure/monitor/metrics/alert?view=azure-cli-lts
- Microsoft Learn: Supported metrics for Microsoft.Web/sites - https://learn.microsoft.com/en-us/azure/azure-monitor/reference/supported-metrics/microsoft-web-sites-metrics
- Microsoft Learn: Python developer reference for Azure Functions - https://learn.microsoft.com/en-us/azure/azure-functions/functions-reference-python

## Issues Found
- The App Service alert example described `Http5xx` as an error rate. `Http5xx` is a count metric, so the text now describes it as an HTTP 5xx error count.
- The Azure Monitor gate configuration mixed up alert state and monitor condition. The post now uses `New` and `Acknowledged` for alert state and `Fired` for monitor condition.
- The Azure Monitor gate settings referred to a resource type set to "All" and a "Greater than 0" filter condition. The official task exposes filter type by resource, alert rule, or none, and succeeds when no matching alert rules are activated. The configuration text was corrected accordingly.
- The Azure Function example called undefined helper functions. Placeholder helper functions were added so the snippet is syntactically complete while preserving the author's intended custom health-check flow.
- The custom Azure Function gate instructions used the generic "Invoke REST API" gate. The post now uses the purpose-built "Invoke Azure Function" gate for an Azure Function URL.

## Review Notes
The Azure CLI was not installed locally, so CLI flags were verified against the official Microsoft Learn CLI reference rather than local `az --help` output. The built-in Azure Monitor gate is part of classic release gates; YAML pipelines have separate approvals and checks concepts, but the post correctly scopes this tutorial to classic release pipelines.
