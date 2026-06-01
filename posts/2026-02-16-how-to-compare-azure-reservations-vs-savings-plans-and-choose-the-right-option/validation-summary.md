# Validation Summary: How to Compare Azure Reservations vs Savings Plans and Choose the Right Option

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Azure Reservations
- Azure Savings Plans
- Azure Cost Management and Billing
- Azure Consumption REST API
- Azure Cost Management REST API
- Azure CLI `az rest`

## Sources Consulted
- Microsoft Learn: What are savings plans? https://learn.microsoft.com/en-us/azure/cost-management-billing/savings-plan/savings-plan-overview
- Microsoft Learn: Savings plan scopes https://learn.microsoft.com/en-us/azure/cost-management-billing/savings-plan/scope-savings-plan
- Microsoft Learn: Savings plan cancellation policies https://learn.microsoft.com/en-us/azure/cost-management-billing/savings-plan/cancel-savings-plan
- Microsoft Learn: Self-service exchanges and cancel/refunds for Azure Reservations https://learn.microsoft.com/en-us/azure/cost-management-billing/reservations/exchange-and-refund-azure-reservations
- Microsoft Learn: Buy a reservation https://learn.microsoft.com/en-us/azure/cost-management-billing/reservations/prepare-buy-reservation
- Microsoft Learn: Reservation Recommendations - List REST API https://learn.microsoft.com/en-us/rest/api/consumption/reservation-recommendations/list?view=rest-consumption-2024-08-01
- Microsoft Learn: Benefit Recommendations - List REST API https://learn.microsoft.com/en-us/rest/api/cost-management/benefit-recommendations/list?view=rest-cost-management-2025-03-01

## Issues Found
- The post described savings plans as only compute-oriented and listed a Machine Learning Savings Plan. Microsoft currently documents compute savings plans and database savings plans, so the savings plan section was updated.
- The post said savings plans do not cover database services. Microsoft documents database savings plan coverage for services including Azure SQL Database, Azure SQL Managed Instance, PostgreSQL, MySQL, and Cosmos DB, so database-related guidance was corrected.
- The comparison table omitted resource group scope for savings plans. Microsoft documents resource group, subscription, management group, and shared scopes, so the table was updated.
- The payment options listed "no upfront" for Azure reservations and savings plans. Microsoft documents upfront and monthly payments, so the table was corrected.
- The reservation cancellation guidance stated a 12% early termination fee as current. Microsoft says it is not currently charging the possible 12% fee, so the table and practical tip were updated.
- The Azure CLI reservation recommendation example used an unsupported-looking `az consumption reservation recommendation list` shape for subscription scope. It was replaced with `az rest` against the current Reservation Recommendations REST API.
- The savings plan REST example used an outdated API version, called the endpoint "Benefit Utilization Summaries," and queried incorrect fields. It was updated to the current Benefit Recommendations REST API and documented response fields.
- The decision framework assumed non-compute services should always use reservations. It was updated to ask whether the service is savings-plan eligible, which accounts for database savings plans.

## Review Notes
The Azure CLI binary is not installed in this local environment, so command validation was performed against Microsoft REST API documentation rather than by executing `az`. The `az rest` syntax uses current Azure Resource Manager endpoints, but it still requires the reader to be authenticated with Azure CLI and to have permissions for the relevant billing or subscription scope.
