# Validation Summary: How to Integrate Microsoft Teams with Azure DevOps

## Status
validated

## Post Type
Tutorial / integration guide

## Technologies Covered
- Microsoft Teams
- Azure DevOps Services
- Azure Boards, Azure Repos, and Azure Pipelines apps for Teams
- Azure DevOps Service Hooks and Webhooks
- Azure Functions for Python
- Azure DevOps REST APIs for Work, Work Item Tracking, and Service Hooks
- Adaptive Cards for Teams webhooks

## Sources Consulted
- Microsoft Learn: Azure DevOps integration with Microsoft Teams - https://learn.microsoft.com/en-us/azure/devops/service-hooks/services/teams?view=azure-devops
- Microsoft Learn: Use Azure Boards in Microsoft Teams - https://learn.microsoft.com/en-gb/azure/devops/boards/integrations/boards-teams?view=azure-devops
- Microsoft Learn: Use Azure Repos with Microsoft Teams - https://learn.microsoft.com/en-us/azure/devops/repos/integrations/repos-teams?view=azure-devops
- Microsoft Learn: Azure DevOps service hook events - https://learn.microsoft.com/en-us/azure/devops/service-hooks/events?view=azure-devops
- Microsoft Learn: Azure DevOps Webhooks service hooks - https://learn.microsoft.com/en-us/azure/devops/service-hooks/services/webhooks?view=azure-devops
- Microsoft Learn: Service Hooks Subscriptions Create REST API 7.1 - https://learn.microsoft.com/en-us/rest/api/azure/devops/hooks/subscriptions/create?view=azure-devops-rest-7.1
- Microsoft Learn: Work Items List REST API 7.1 - https://learn.microsoft.com/en-us/rest/api/azure/devops/wit/work-items/list?view=azure-devops-rest-7.1
- Microsoft Learn: WIQL Query By WIQL REST API 7.1 - https://learn.microsoft.com/en-us/rest/api/azure/devops/wit/wiql/query-by-wiql?view=azure-devops-rest-7.1
- Microsoft Learn: Teams incoming webhooks and Workflows - https://learn.microsoft.com/en-us/microsoftteams/platform/webhooks-and-connectors/how-to/add-incoming-webhook
- Microsoft Learn: Azure Functions timer trigger for Python - https://learn.microsoft.com/en-us/azure/azure-functions/functions-bindings-timer?pivots=programming-language-python&tabs=python-v2%2Cin-process%2Cnodejs-v4
- Microsoft Learn: Azure Functions Python developer reference - https://learn.microsoft.com/en-us/azure/azure-functions/functions-reference-python

## Issues Found
- The post used a generic `@Azure DevOps subscribe` command with unsupported `--area-path` and `--event` flags. Replaced it with the documented Azure Boards, Azure Repos, and Azure Pipelines app commands and subscription-management commands.
- The post described Azure DevOps service hooks posting formatted custom notifications directly to a Teams incoming webhook. Azure DevOps Web Hooks send Azure DevOps event payloads to an HTTPS endpoint; they do not transform those payloads into Teams cards. Updated the flow to use an Azure Function receiver that formats and posts messages to Teams.
- The Teams incoming webhook setup steps referenced the retired Connectors path. Updated the instructions to use the Workflows app webhook flow recommended in current Microsoft Teams documentation.
- The service hook sample used Azure DevOps REST API version `7.0`. Updated the subscription, iteration, WIQL, and work item calls to current `7.1` examples from Microsoft Learn.
- The timer trigger comment said "9 AM" without noting Azure Functions timer schedules default to UTC. Updated the comment to say 9 AM UTC unless `WEBSITE_TIME_ZONE` is configured.
- The Python code used `datetime.utcnow()`, which is discouraged in current Python. Replaced it with `datetime.now(timezone.utc)`.
- The metric-card helper accepted a `style` argument but did not use it. Added the Adaptive Card `color` property so the supplied values have an effect.
- The PR URL builder transformed the Azure DevOps REST API URL with string replacements, which can produce invalid portal URLs. Replaced it with a portal URL built from the organization, project, repository name, and pull request ID.
- The build notification snippet assigned an `emoji` variable but never used it. Removed the unused assignment.

## Review Notes
All Python code blocks parse successfully with `python3` AST parsing. The snippets remain examples and still require real Azure DevOps project IDs, PAT scopes, deployed Azure Function endpoints, and Teams webhook URLs before they can run in a live environment.
