# Validation Summary: How to Use Azure Cost Management Cost Analysis Views to Identify Spending Trends

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Cost Management
- Cost Analysis views
- Azure portal cost reporting
- Azure Cost Management Query REST API
- Azure CLI `az rest`

## Sources Consulted
- Microsoft Learn: Use built-in views in Cost Analysis - https://learn.microsoft.com/en-us/azure/cost-management-billing/costs/cost-analysis-built-in-views
- Microsoft Learn: Quickstart - Start using Cost Analysis - https://learn.microsoft.com/en-us/azure/cost-management-billing/costs/quick-acm-cost-analysis
- Microsoft Learn: Customize views in Cost Analysis - https://learn.microsoft.com/en-us/azure/cost-management-billing/costs/customize-cost-analysis-views
- Microsoft Learn: Save and share customized views - https://learn.microsoft.com/en-us/azure/cost-management-billing/costs/save-share-views
- Microsoft Learn: Group and filter options in Cost Analysis and Budgets - https://learn.microsoft.com/en-us/azure/cost-management-billing/costs/group-filter
- Microsoft Learn: Azure CLI `az costmanagement` reference - https://learn.microsoft.com/en-us/cli/azure/costmanagement?view=azure-cli-latest
- Microsoft Learn: Cost Management Query Usage REST API - https://learn.microsoft.com/en-us/rest/api/cost-management/query/usage?view=rest-cost-management-2025-03-01

## Issues Found
- The post stated that Cost Analysis supports nested primary and secondary group-bys. Microsoft documentation says Cost Analysis doesn't support grouping by multiple attributes in the same chart. Updated the section to recommend filtering by one attribute and grouping by another.
- The programmatic example used `az costmanagement query`, which is not present in the current Azure CLI costmanagement extension reference. Replaced it with `az rest` against the supported Cost Management Query REST API endpoint, using a valid request body for month-to-date actual cost grouped by `ServiceName`.

## Review Notes
Azure CLI was not installed in the local environment, so command verification was performed against Microsoft Learn's current Azure CLI reference and Cost Management REST API documentation.
