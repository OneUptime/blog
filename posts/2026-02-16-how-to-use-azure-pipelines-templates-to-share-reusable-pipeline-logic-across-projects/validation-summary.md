# Validation Summary: Use Azure Pipelines Templates to Share Reusable Pipeline Logic Across Projects

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Pipelines
- Azure DevOps YAML templates
- Azure Pipelines repository resources
- Azure Pipelines template expressions and parameters
- Azure Pipelines variable templates
- DotNetCoreCLI@2 task
- Docker@2 task
- AzureWebApp@1 task
- Azure DevOps Pipelines REST API

## Sources Consulted
- Microsoft Learn: Use YAML templates in pipelines for reusable and secure processes - https://learn.microsoft.com/en-us/azure/devops/pipelines/process/templates?view=azure-devops
- Microsoft Learn: Template expressions - https://learn.microsoft.com/en-us/azure/devops/pipelines/process/template-expressions?view=azure-devops
- Microsoft Learn: steps.template definition - https://learn.microsoft.com/en-us/azure/devops/pipelines/yaml-schema/steps-template?view=azure-pipelines
- Microsoft Learn: jobs definition - https://learn.microsoft.com/en-us/azure/devops/pipelines/yaml-schema/jobs?view=azure-pipelines
- Microsoft Learn: stages.template definition - https://learn.microsoft.com/en-us/azure/devops/pipelines/yaml-schema/stages-template?view=azure-pipelines
- Microsoft Learn: resources.repositories.repository definition - https://learn.microsoft.com/en-us/azure/devops/pipelines/yaml-schema/resources-repositories-repository?view=azure-pipelines
- Microsoft Learn: variables definition - https://learn.microsoft.com/en-us/azure/devops/pipelines/yaml-schema/variables?view=azure-pipelines
- Microsoft Learn: DotNetCoreCLI@2 task reference - https://learn.microsoft.com/en-us/azure/devops/pipelines/tasks/reference/dotnet-core-cli-v2?view=azure-pipelines
- Microsoft Learn: Docker@2 task reference - https://learn.microsoft.com/en-us/azure/devops/pipelines/tasks/reference/docker-v2?view=azure-pipelines
- Microsoft Learn: AzureWebApp@1 task reference - https://learn.microsoft.com/en-us/azure/devops/pipelines/tasks/reference/azure-web-app-v1?view=azure-pipelines
- Microsoft Learn: Pipelines Preview REST API - https://learn.microsoft.com/en-us/rest/api/azure/devops/pipelines/preview/preview?view=azure-devops-rest-7.1

## Issues Found
- The Docker job template used a `registry` parameter with a raw ACR login-server-style default (`myregistry.azurecr.io`) as the `containerRegistry` input. Microsoft documents `containerRegistry` as the name of a Docker registry service connection. I changed the parameter to `registryServiceConnection` with a service-connection-style default and used it anywhere `containerRegistry` is passed.
- The Docker build step used `dockerfile` as an input name. Microsoft documents the Docker@2 task input as `Dockerfile`, so I updated the snippet to use the documented input name.
- The Docker build and push steps did not explicitly pass `containerRegistry`. I added the service connection to both steps so the repository is associated with the intended authenticated registry.

## Review Notes
The remaining Azure Pipelines template examples, repository resource syntax, variable template syntax, template expressions, DotNetCoreCLI@2 usage, AzureWebApp@1 usage, and REST API preview claim are consistent with the official documentation consulted. The versioning guidance is technically sound, though teams may also pin repository resources directly to a commit SHA where their governance process allows it.
