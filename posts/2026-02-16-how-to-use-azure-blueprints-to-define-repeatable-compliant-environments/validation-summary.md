# Validation Summary: How to Use Azure Blueprints to Define Repeatable Compliant Environments

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Blueprints
- Azure REST API
- Azure CLI `az rest`
- Azure Policy
- Azure RBAC
- ARM templates
- Log Analytics workspaces
- Azure Deployment Stacks and Template Specs

## Sources Consulted
- Microsoft Learn: What is Azure Blueprints (Preview) - https://learn.microsoft.com/en-us/azure/governance/blueprints/overview
- Microsoft Learn: Blueprints REST API reference - https://learn.microsoft.com/en-us/rest/api/blueprints/
- Microsoft Learn: Blueprints - Create Or Update REST API - https://learn.microsoft.com/en-us/rest/api/blueprints/blueprints/create-or-update?view=rest-blueprints-2018-11-01-preview
- Microsoft Learn: Artifacts - Create Or Update REST API - https://learn.microsoft.com/en-us/rest/api/blueprints/artifacts/create-or-update?view=rest-blueprints-2018-11-01-preview
- Microsoft Learn: Assignments - Create Or Update REST API - https://learn.microsoft.com/en-us/rest/api/blueprints/assignments/create-or-update?view=rest-blueprints-2018-11-01-preview
- Microsoft Learn: Quickstart: Create a blueprint with REST API - https://learn.microsoft.com/en-us/azure/governance/blueprints/create-blueprint-rest-api
- Microsoft Learn: Understand resource locking in Azure Blueprints - https://learn.microsoft.com/en-us/azure/governance/blueprints/concepts/resource-locking
- Microsoft Learn: Azure CLI `az blueprint` reference - https://learn.microsoft.com/en-us/cli/azure/blueprint?view=azure-cli-latest
- Microsoft Learn: Microsoft.OperationalInsights/workspaces ARM template reference - https://learn.microsoft.com/en-us/azure/templates/microsoft.operationalinsights/workspaces

## Issues Found
- The post said Blueprints would "eventually" be superseded and remained fully supported. Updated this to the documented July 11, 2026 deprecation date and the recommended migration path to Template Specs and Deployment Stacks.
- The post said Blueprints lacked full Azure CLI support. Updated this to note that the Azure CLI Blueprint extension exists but is deprecated and scheduled for removal, which is why the examples use REST.
- The resource group example used a non-existent `kind: "resourceGroup"` artifact at the artifact endpoint. Replaced it with a Blueprint definition update using the documented `properties.resourceGroups` placeholder model.
- The ARM template artifact referenced Blueprint-level parameters directly inside the nested ARM template. Added an ARM template parameter and passed the Blueprint expressions through the artifact `parameters` block.
- The assignment update example omitted required `resourceGroups` values. Added the same resource group placeholder values and lock settings used by the initial assignment.
- The unassignment section said policy and RBAC assignments are removed. Updated it to match the documentation: unassignment removes the assignment and Blueprint locks, while artifact resources are left behind and require separate cleanup.

## Review Notes
Azure Blueprints is still technically relevant for existing environments as of May 30, 2026, but it is near deprecation. Future posts should prefer Template Specs, Deployment Stacks, Azure Policy, and Bicep for new governance baseline implementations.
