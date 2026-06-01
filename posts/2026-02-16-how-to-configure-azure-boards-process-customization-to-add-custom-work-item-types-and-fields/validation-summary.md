# Validation Summary: How to Configure Azure Boards Process Customization to Add Custom Work Item

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Boards
- Azure DevOps inherited process customization
- Azure DevOps work item types, fields, rules, layouts, backlogs, and boards
- Azure DevOps REST API
- Azure DevOps CLI

## Sources Consulted
- Microsoft Learn: Customize a project by using an inherited process - https://learn.microsoft.com/en-us/azure/devops/organizations/settings/work/customize-process?view=azure-devops
- Microsoft Learn: Process customization and inheritance - https://learn.microsoft.com/en-us/azure/devops/organizations/settings/work/inheritance-process-model?view=azure-devops
- Microsoft Learn: Add and manage fields for an inherited process - https://learn.microsoft.com/en-us/azure/devops/organizations/settings/work/customize-process-field?view=azure-devops
- Microsoft Learn: Customize backlogs and boards for an inherited process - https://learn.microsoft.com/en-us/azure/devops/organizations/settings/work/customize-process-backlogs-boards?view=azure-devops
- Microsoft Learn: Fields - Add REST API - https://learn.microsoft.com/en-us/rest/api/azure/devops/processes/fields/add?view=azure-devops-rest-7.1
- Microsoft Learn: Processes - List REST API - https://learn.microsoft.com/en-us/rest/api/azure/devops/processes/processes/list?view=azure-devops-rest-7.1
- Microsoft Learn: Azure DevOps CLI az devops invoke - https://learn.microsoft.com/en-us/cli/azure/devops?view=azure-cli-latest

## Issues Found
- The post said a new custom work item type starts with the same layout as a base type. Microsoft documentation describes adding a custom WIT with a default form that can then be customized, not as cloning the layout of a selected base type. Changed this to say the new type starts with a default layout that can be customized.
- The backlog section did not explicitly mention that custom work item types are not added to any backlog by default. Added that caveat because it affects whether the new type appears on backlog and board views.
- The REST API field example used the stable `7.1` API version and included `name`, `type`, and `description` in the `Fields - Add` request body. The documented add-field-to-WIT endpoint uses `7.1-preview.2` and accepts fields such as `referenceName`, `defaultValue`, `allowedValues`, `required`, `readOnly`, and `allowGroups`. Updated the example to add an existing field to a WIT with the documented preview API version and payload shape.
- The Azure DevOps CLI `az devops invoke` example omitted an API version, causing it to rely on the command default. Added `--api-version 7.1` to align the example with the current REST API version discussed.

## Review Notes
The Azure CLI was not installed in the local environment, so CLI syntax was verified against Microsoft Learn rather than local `az --help` output. The rest of the post's UI workflow and conceptual guidance matched current Microsoft documentation for Azure DevOps inherited process customization.
