# Validation Summary: How to Analyze Azure Reserved Instance Utilization in Azure Cost Management

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Reservations / Reserved Instances
- Azure Cost Management
- Azure Consumption REST API
- Azure CLI
- Azure Advisor
- Azure Resource Graph KQL
- Python requests
- Power BI / Cost Management exports

## Sources Consulted
- Microsoft Learn: View reservation utilization after purchase - https://learn.microsoft.com/en-us/azure/cost-management-billing/reservations/reservation-utilization
- Microsoft Learn: Reservations Summaries - List REST API - https://learn.microsoft.com/en-us/rest/api/consumption/reservations-summaries/list?view=rest-consumption-2024-08-01
- Microsoft Learn: Reservations Details REST API - https://learn.microsoft.com/en-us/rest/api/consumption/reservations-details?view=rest-consumption-2024-08-01
- Microsoft Learn: Azure CLI `az reservations reservation` - https://learn.microsoft.com/en-us/cli/azure/reservations/reservation?view=azure-cli-latest
- Microsoft Learn: Azure CLI `az advisor recommendation` - https://learn.microsoft.com/en-us/cli/azure/advisor/recommendation?view=azure-cli-latest
- Microsoft Learn: Advisor data in Azure Resource Graph - https://learn.microsoft.com/en-us/azure/advisor/advisor-azure-resource-graph
- Microsoft Learn: Azure Resource Graph sample queries by category - https://learn.microsoft.com/en-us/azure/governance/resource-graph/samples/samples-by-category
- Microsoft Learn: Reservation utilization alerts - https://learn.microsoft.com/en-us/azure/cost-management-billing/costs/reservation-utilization-alerts
- Microsoft Learn: Self-service exchanges and refunds for Azure Reservations - https://learn.microsoft.com/en-us/azure/cost-management-billing/reservations/exchange-and-refund-azure-reservations
- Microsoft Learn: Tutorial - Create and manage Cost Management exports - https://learn.microsoft.com/en-us/azure/cost-management-billing/costs/tutorial-improved-exports

## Issues Found
- The reservation summaries API examples used an older API version and passed `startDate` / `endDate` directly at billing account scope. Updated the examples to use the current `2024-08-01` API and the documented `$filter=properties/usageDate ...` pattern for daily summaries.
- The text said the reservation summaries response includes the specific consuming resources. Corrected it to say summaries include utilization and quantity/hour fields, and that reservation details should be used for resource-level consumption details.
- The Python API example used the same outdated query pattern and did not check HTTP errors. Updated it to pass documented query parameters with `requests` and call `raise_for_status()`.
- The KQL section described `AdvisorResources` as a Log Analytics table and projected `TimeGenerated`. Corrected it to Azure Resource Graph / Workbooks usage and projected documented Advisor recommendation fields.
- The instance flexibility check queried `properties.appliedScopeType`, which reports scope rather than flexibility. Updated it to query `properties.instanceFlexibility`.
- The exchange/return guidance implied reservations could be exchanged for a different type and that an early termination fee currently applies. Corrected it to same-type exchanges and Microsoft's current policy that no cancellation fee is charged now, though a 12% fee might apply in the future.
- The utilization alert command used `az monitor metrics alert create` with a non-documented `ReservationUtilizationPercentage` metric on a billing account scope. Replaced it with the documented Cost Management reservation utilization alert workflow in the Azure portal.

## Review Notes
- The local environment did not have Azure CLI installed, so CLI validation was performed against official Microsoft Learn CLI reference pages instead of local `az --help`.
- The Python snippets were syntax-checked with `python3`. Runtime calls were not executed because they require Azure credentials and billing account access.
