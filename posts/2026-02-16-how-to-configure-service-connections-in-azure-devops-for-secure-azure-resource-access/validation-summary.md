# Validation Summary: How to Configure Service Connections in Azure DevOps

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure DevOps service connections
- Azure Pipelines YAML tasks
- Azure Resource Manager service connections
- Microsoft Entra service principals and app registrations
- Workload identity federation / OIDC
- Azure CLI
- Docker registry service connections
- Kubernetes service connections

## Sources Consulted
- Microsoft Learn: Connect to Azure with an Azure Resource Manager service connection - https://learn.microsoft.com/en-us/azure/devops/pipelines/library/connect-to-azure?view=azure-devops
- Microsoft Learn: Manage service connections - https://learn.microsoft.com/en-us/azure/devops/pipelines/library/service-endpoints?view=azure-devops
- Microsoft Learn: Manage security in Azure Pipelines - https://learn.microsoft.com/en-us/azure/devops/pipelines/policies/permissions?view=azure-devops
- Microsoft Learn: Manually set an Azure Resource Manager service connection with a secret - https://learn.microsoft.com/en-us/azure/devops/pipelines/release/configure-app-secret?view=azure-devops
- Microsoft Learn: Manually set an Azure Resource Manager workload identity service connection - https://learn.microsoft.com/en-us/azure/devops/pipelines/release/configure-workload-identity?view=azure-devops
- Microsoft Learn: Pipeline deployment approvals - https://learn.microsoft.com/en-us/azure/devops/pipelines/process/approvals?view=azure-devops
- Microsoft Learn: AzureCLI@2 task reference - https://learn.microsoft.com/en-us/azure/devops/pipelines/tasks/reference/azure-cli-v2?view=azure-pipelines
- Microsoft Learn: AzureWebApp@1 task reference - https://learn.microsoft.com/en-us/azure/devops/pipelines/tasks/reference/azure-web-app-v1?view=azure-pipelines
- Microsoft Learn: Docker@2 task reference - https://learn.microsoft.com/en-us/azure/devops/pipelines/tasks/reference/docker-v2?view=azure-pipelines
- Microsoft Learn: KubernetesManifest@1 task reference - https://learn.microsoft.com/en-us/azure/devops/pipelines/tasks/reference/kubernetes-manifest-v1?view=azure-pipelines
- Microsoft Learn: az ad sp CLI reference - https://learn.microsoft.com/en-us/cli/azure/ad/sp?view=azure-cli-latest
- Microsoft Learn: az ad app credential CLI reference - https://learn.microsoft.com/en-us/cli/azure/ad/app/credential?view=azure-cli-latest

## Issues Found
- Updated the automatic Azure Resource Manager service connection path to identify workload identity federation as the recommended automatic option. Microsoft now documents secret-based automatic app registration as a backward-compatibility or edge-case option, while workload identity federation is recommended for new service connections.
- Corrected the automatic-creation behavior so it describes federated identity credential creation instead of stored secret storage for the recommended automatic path.
- Corrected the pipeline-permissions guidance. Service connections are only available to all pipelines when open access / grant access to all pipelines is selected; otherwise each pipeline must be authorized explicitly.
- Updated the project-permissions wording to reflect shared service connections across projects.
- Fixed the scheduled credential-check example so it checks every credential on each app registration instead of only the first credential.

## Review Notes
The Azure CLI could not be verified locally because `az` is not installed in this workspace, so CLI commands were verified against the official Microsoft Learn CLI reference instead. The YAML task examples matched the current Microsoft task references.
