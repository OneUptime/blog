# Validation Summary: How to Use Azure API Management Revisions for Non-Breaking API Changes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure API Management
- Azure API Management API revisions and versions
- Azure CLI
- Azure API Management policies
- OpenAPI import workflow

## Sources Consulted
- Microsoft Learn: Revisions in Azure API Management - https://learn.microsoft.com/en-us/azure/api-management/api-management-revisions
- Microsoft Learn: Tutorial: Use revisions in API Management for safe nonbreaking API changes - https://learn.microsoft.com/en-us/azure/api-management/api-management-get-started-revise-api
- Microsoft Learn: Versions in Azure API Management - https://learn.microsoft.com/en-us/azure/api-management/api-management-versions
- Microsoft Learn: Azure CLI `az apim api revision` - https://learn.microsoft.com/en-us/cli/azure/apim/api/revision
- Microsoft Learn: Azure CLI `az apim api release` - https://learn.microsoft.com/en-us/cli/azure/apim/api/release
- Microsoft Learn: Azure CLI `az apim api import` - https://learn.microsoft.com/en-us/cli/azure/apim/api
- Microsoft Learn: Azure API Management `set-query-parameter` policy - https://learn.microsoft.com/en-us/azure/api-management/set-query-parameter-policy
- Microsoft Learn: Understanding Azure API Management service limits - https://learn.microsoft.com/en-us/azure/api-management/service-limits

## Issues Found
- The post said a revision can be selected with a `rev` query parameter or `Ocp-Apim-Revision` header. Microsoft documents revision access by appending `;rev={revisionNumber}` to the API URL path before the query string. Updated the testing examples and CI/CD workflow note accordingly.
- The post said APIM supports up to 10 non-current revisions per API. Current Microsoft service-limit documentation describes versions and revisions as counting toward broader API-related resource limits, not a current fixed 10 non-current revision limit. Replaced the statement with a resource-limit note and cleanup guidance.

## Review Notes
Azure CLI could not be checked locally because the `az` executable is not installed in this environment, so CLI syntax was verified against Microsoft Learn. The `set-query-parameter` policy example is valid for inbound policy usage, and the `az apim api revision create`, `az apim api import`, and `az apim api release create` commands use documented options.
