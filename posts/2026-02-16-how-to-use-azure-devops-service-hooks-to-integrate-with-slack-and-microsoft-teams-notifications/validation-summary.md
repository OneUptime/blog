# Validation Summary: How to Use Azure DevOps Service Hooks to Integrate with Slack

## Status
validated

## Post Type
Tutorial / integration guide

## Technologies Covered
- Azure DevOps Service Hooks
- Azure Pipelines
- Azure Repos
- Azure Boards
- Slack apps and incoming webhooks
- Microsoft Teams apps and Workflows webhooks
- Azure Functions for Python
- Azure DevOps Service Hooks REST API

## Sources Consulted
- Microsoft Learn: Azure DevOps service hook events - https://learn.microsoft.com/en-us/azure/devops/service-hooks/events?view=azure-devops
- Microsoft Learn: Azure Pipelines with Slack - https://learn.microsoft.com/en-us/azure/devops/pipelines/integrations/slack?view=azure-devops
- Microsoft Learn: Azure Repos with Slack - https://learn.microsoft.com/en-us/azure/devops/repos/integrations/repos-slack?view=azure-devops
- Microsoft Learn: Azure Boards with Slack - https://learn.microsoft.com/en-us/azure/devops/boards/integrations/boards-slack?view=azure-devops
- Microsoft Learn: Azure Repos with Microsoft Teams - https://learn.microsoft.com/en-us/azure/devops/repos/integrations/repos-teams?view=azure-devops
- Microsoft Learn: Azure Boards in Microsoft Teams - https://learn.microsoft.com/en-us/azure/devops/boards/integrations/boards-teams?view=azure-devops
- Microsoft Learn: Azure DevOps integration with Microsoft Teams - https://learn.microsoft.com/en-us/azure/devops/service-hooks/services/teams?view=azure-devops
- Microsoft Learn: Manage Microsoft 365 connectors and custom connectors - https://learn.microsoft.com/en-us/microsoftteams/m365-custom-connectors
- Microsoft Teams Marketplace: Azure Pipelines for Microsoft Teams - https://marketplace.microsoft.com/en-us/product/office/wa200000055
- Slack API: Sending messages using incoming webhooks - https://api.slack.com/messaging/webhooks
- Slack API: Block Kit reference - https://api.slack.com/block-kit
- Microsoft Learn: Azure Functions Python developer guide - https://learn.microsoft.com/en-us/azure/azure-functions/functions-reference-python
- Microsoft Learn: Azure DevOps Service Hooks REST API - https://learn.microsoft.com/en-us/rest/api/azure/devops/hooks/subscriptions?view=azure-devops-rest-7.1

## Issues Found
- The Slack app section described a single `/azdevops` command and showed unsupported `--event` and `--id` examples. Updated the section to use the official product-specific Slack apps and commands: `/azpipelines`, `/azrepos`, and `/azboards`.
- The Azure Boards Slack example used `/azboards subscribe`, but the official command for connecting a project is `/azboards link`. Updated the example.
- The Microsoft Teams app section described a single `@Azure DevOps subscribe` command. Updated it to the current product-specific Teams app commands, including `@azure pipelines`, `@azure repos`, and `@azure boards link`.
- The Teams webhook section mixed the retired Office 365 connector setup path with the newer Workflows approach. Updated it to describe the Power Automate workflow trigger and clarified that Azure DevOps should call a router endpoint when the payload needs transformation.
- The Azure Function example checked `resource.status == "failed"` for build completion. Azure DevOps build completion payloads use `result` for succeeded/failed result details after completion, so the example now checks `resource.result`.
- The Slack routing example used legacy attachment action formatting and referenced undefined formatter functions for deployments and pull requests. Updated the Slack message example to use Block Kit and added minimal formatter functions for those branches.

## Review Notes
The post is technically relevant and remains a valid tutorial after correction. Teams webhook behavior is still an area to watch because Microsoft is actively retiring Microsoft 365 connectors and steering new webhook scenarios toward Workflows and Power Automate.
