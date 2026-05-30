# Validation Summary: How to Use Azure Cost Management APIs to Build Custom Cost Dashboards

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Cost Management REST APIs
- Azure Cost Management Query API
- Azure Cost Management Forecast API
- Azure Cost Management Exports, Budgets, Dimensions, and Price Sheet APIs
- Microsoft Entra ID authentication
- Azure CLI
- Azure Identity for Python
- Azure Cost Management Python SDK
- Flask
- Python requests

## Sources Consulted
- Microsoft Learn: Query - Usage REST API, https://learn.microsoft.com/en-us/rest/api/cost-management/query/usage?view=rest-cost-management-2025-03-01
- Microsoft Learn: Forecast - Usage REST API, https://learn.microsoft.com/en-us/rest/api/cost-management/forecast/usage?view=rest-cost-management-2025-03-01
- Microsoft Learn: Azure Cost Management Python SDK QueryDefinition, https://learn.microsoft.com/en-us/python/api/azure-mgmt-costmanagement/azure.mgmt.costmanagement.models.querydefinition?view=azure-python
- Microsoft Learn: Azure Cost Management Python SDK QueryDataset, https://learn.microsoft.com/en-us/python/api/azure-mgmt-costmanagement/azure.mgmt.costmanagement.models.querydataset?view=azure-python
- Microsoft Learn: Azure Cost Management Python SDK ForecastDefinition, https://learn.microsoft.com/en-us/python/api/azure-mgmt-costmanagement/azure.mgmt.costmanagement.models.forecastdefinition?view=azure-python
- Microsoft Learn: Azure Cost Management Python SDK ForecastDataset, https://learn.microsoft.com/en-us/python/api/azure-mgmt-costmanagement/azure.mgmt.costmanagement.models.forecastdataset?view=azure-python
- Microsoft Learn: Azure Cost Management Python SDK QueryOperations, https://learn.microsoft.com/en-us/python/api/azure-mgmt-costmanagement/azure.mgmt.costmanagement.operations.queryoperations?view=azure-python
- Microsoft Learn: Manage Azure costs with automation, https://learn.microsoft.com/en-us/azure/cost-management-billing/costs/manage-automation
- Microsoft Learn: Understand Cost Management data, https://learn.microsoft.com/en-us/azure/cost-management-billing/costs/understand-cost-mgt-data
- Microsoft Learn: Understand and work with Cost Management scopes, https://learn.microsoft.com/en-us/azure/cost-management-billing/costs/understand-work-scopes
- Microsoft Learn: Assign permissions to Cost Management APIs, https://learn.microsoft.com/en-us/azure/cost-management-billing/automate/cost-management-api-permissions
- Microsoft Learn: Azure CLI az ad sp create-for-rbac, https://learn.microsoft.com/en-us/cli/azure/ad/sp?view=azure-cli-latest
- Microsoft Learn: Azure CLI az account get-access-token, https://learn.microsoft.com/en-us/cli/azure/account?view=azure-cli-latest
- Microsoft Learn: Price Sheet REST API, https://learn.microsoft.com/en-us/rest/api/cost-management/price-sheet?view=rest-cost-management-2025-03-01

## Issues Found
- The REST Query API example used `api-version=2023-03-01`. Updated it to the current `2025-03-01` API version from Microsoft Learn.
- The forecast Python example used `QueryAggregation` inside a `ForecastDataset`. Changed it to import and use `ForecastAggregation`, which is the model required by the Forecast SDK documentation.
- The Flask dashboard examples used `granularity="None"`, but the Query API granularity values are not expressed as the string `"None"`. Changed these to `granularity=None` so the SDK omits row granularity.
- The cache example used `if cached:`, which would miss cached empty results. Changed it to `if cached is not None:`.
- The pagination example incorrectly called `usage_by_external_cloud_provider_type`, which is for external cloud provider scopes and does not follow a subscription query `nextLink`. Replaced it with a REST-based loop that follows the returned `nextLink`.
- The rate-limit section listed fixed request-per-minute values that do not match current Cost Management Query API guidance. Replaced them with the current QPU quota guidance and retry-header behavior from Microsoft Learn.

## Review Notes
The Azure Cost Management Python SDK was not installed in the local environment, so SDK validation was performed against official Microsoft Learn API reference pages rather than local imports. The post remains a minimal tutorial; a production implementation should also inspect retry headers directly instead of matching `429` in exception text.
