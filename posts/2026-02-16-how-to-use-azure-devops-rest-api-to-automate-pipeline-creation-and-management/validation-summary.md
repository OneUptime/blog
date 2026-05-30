# Validation Summary: How to Use Azure DevOps REST API to Automate Pipeline Creation and Management

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure DevOps REST API
- Azure Pipelines
- Azure DevOps Build API
- Azure DevOps Release API
- Azure Repos Git API
- Personal Access Tokens
- curl
- Python requests

## Sources Consulted
- Microsoft Learn: Get started with the REST APIs for Azure DevOps - https://learn.microsoft.com/en-us/azure/devops/integrate/how-to/call-rest-api?view=azure-devops
- Microsoft Learn: REST API samples for Azure DevOps - https://learn.microsoft.com/en-us/azure/devops/integrate/get-started/rest/samples?view=azure-devops
- Microsoft Learn: Use personal access tokens - https://learn.microsoft.com/en-us/azure/devops/organizations/accounts/use-personal-access-tokens-to-authenticate?view=azure-devops
- Microsoft Learn: Pipelines - Create - https://learn.microsoft.com/en-us/rest/api/azure/devops/pipelines/pipelines/create?view=azure-devops-rest-7.1
- Microsoft Learn: Runs - Run Pipeline - https://learn.microsoft.com/en-us/rest/api/azure/devops/pipelines/runs/run-pipeline?view=azure-devops-rest-7.1
- Microsoft Learn: Runs - Get - https://learn.microsoft.com/en-us/rest/api/azure/devops/pipelines/runs/get?view=azure-devops-rest-7.1
- Microsoft Learn: Build Definitions - Update - https://learn.microsoft.com/en-us/rest/api/azure/devops/build/definitions/update?view=azure-devops-rest-7.1
- Microsoft Learn: Git Repositories - List - https://learn.microsoft.com/en-us/rest/api/azure/devops/git/repositories/list?view=azure-devops-rest-7.1
- Microsoft Learn: Git Repositories - Get Repository - https://learn.microsoft.com/en-us/rest/api/azure/devops/git/repositories/get-repository?view=azure-devops-rest-7.1
- Microsoft Learn: Releases - List - https://learn.microsoft.com/en-us/rest/api/azure/devops/release/releases/list?view=azure-devops-rest-7.1
- Microsoft Learn: Rate and usage limits - https://learn.microsoft.com/en-us/azure/devops/integrate/concepts/rate-limits?view=azure-devops

## Issues Found
- The post said the REST API lets you do everything the portal does. Changed this to "many of the things" because the REST API is broad but not a complete one-to-one replacement for every portal capability.
- The post described API version 7.1 as the latest stable release. Updated the wording to say the examples pin 7.1 as a stable supported release, because current Microsoft REST guidance for Azure DevOps Services also shows released 7.2 examples.
- The PAT scope guidance omitted Code (Read), but the examples call Git repository endpoints that require the `vso.code` scope. Added Code (Read) to the required scopes for the examples.
- The build definition variable example replaced the full `variables` map, which would remove existing variables. Changed it to update the existing map with `setdefault(...).update(...)`.
- The secret variable example used `value: None`, which would not demonstrate setting a secret value. Changed it to a placeholder secret value from a secret store.

## Review Notes
The examples use PAT authentication, which is still supported for scripts and testing, but Microsoft recommends Microsoft Entra ID tokens for production integrations where possible. The 7.1 endpoint examples remain valid for the APIs shown.
