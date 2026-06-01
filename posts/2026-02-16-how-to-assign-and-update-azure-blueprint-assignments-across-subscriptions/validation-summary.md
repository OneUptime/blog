# Validation Summary: How to Assign and Update Azure Blueprint Assignments Across Subscriptions

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- Azure Blueprints
- Azure Blueprints REST API
- Azure CLI `az rest`
- Azure RBAC and managed identities
- Bash and `jq`
- GitHub Actions

## Sources Consulted
- Microsoft Learn: What is Azure Blueprints (Preview)? https://learn.microsoft.com/en-us/azure/governance/blueprints/overview
- Microsoft Learn: Azure Blueprints Assignments - Create Or Update REST API https://learn.microsoft.com/en-us/rest/api/blueprints/assignments/create-or-update?view=rest-blueprints-2018-11-01-preview
- Microsoft Learn: Azure Blueprints Assignments - Get REST API https://learn.microsoft.com/en-us/rest/api/blueprints/assignments/get?view=rest-blueprints-2018-11-01-preview
- Microsoft Learn: Azure Blueprints Assignments - List REST API https://learn.microsoft.com/en-us/rest/api/blueprints/assignments/list?view=rest-blueprints-2018-11-01-preview
- Microsoft Learn: Azure Blueprints Assignment Operations - List REST API https://learn.microsoft.com/en-us/rest/api/blueprints/assignment-operations/list?view=rest-blueprints-2018-11-01-preview
- Microsoft Learn: Azure CLI `az blueprint` deprecation notice https://learn.microsoft.com/en-us/cli/azure/blueprint?view=azure-cli-latest
- Azure Login GitHub Action documentation https://github.com/Azure/login

## Issues Found
- Azure Blueprints deprecation was not mentioned. Added a note that Azure Blueprints is preview and scheduled for deprecation on July 11, 2026, and pointed new implementations toward Template Specs and Deployment Stacks.
- Provisioning states were shown with incorrect casing and included `Updating`, which is not listed in the 2018-11-01-preview assignment provisioning state enum. Updated the list to the documented lower-case states.
- The failure-diagnostics command queried `properties.status` for errors, but detailed deployment errors are exposed through the `assignmentOperations` endpoint. Updated the command to list assignment operation deployment results and errors.
- The permission guidance said the managed identity needs Owner on the subscription in all cases. Clarified the documented system-assigned REST API behavior: the Azure Blueprints service principal needs Owner on the assigned subscription, while the portal grants and revokes that role automatically.
- The GitHub Actions example used `azure/login@v1`, which is outdated. Updated it to `azure/login@v3`.
- The GitHub Actions status check compared against `Succeeded`, but the REST API returns lower-case provisioning states such as `succeeded`. Updated the comparison.
- A monitoring-script comment said it checked assignments across a management group, but the command enumerates subscriptions visible to the current account. Corrected the comment.

## Review Notes
The REST API examples use the documented 2018-11-01-preview Azure Blueprints API shape, including `identity`, `location`, `properties.blueprintId`, `properties.parameters`, `properties.resourceGroups`, and optional `properties.locks`. The article remains useful for existing Blueprint estates, but Azure Blueprints should not be recommended for new long-term governance work because Microsoft has announced deprecation.
