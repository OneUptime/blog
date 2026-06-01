# Validation Summary: Configure Branch Policies in Azure Repos to Enforce Code Review Requirements

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Repos
- Azure DevOps branch policies
- Azure DevOps pull requests
- Azure Pipelines YAML
- Azure CLI with the azure-devops extension
- .NET Core Azure Pipelines tasks
- Mermaid diagrams

## Sources Consulted
- Microsoft Learn: Branch policies and settings for Azure Repos: https://learn.microsoft.com/en-us/azure/devops/repos/git/branch-policies?view=azure-devops
- Microsoft Learn: About branches and branch policies: https://learn.microsoft.com/en-us/azure/devops/repos/git/branch-policies-overview?view=azure-devops
- Microsoft Learn: Azure CLI `az repos policy approver-count`: https://learn.microsoft.com/en-us/cli/azure/repos/policy/approver-count?view=azure-cli-latest
- Microsoft Learn: Azure CLI `az repos`: https://learn.microsoft.com/en-us/cli/azure/repos?view=azure-cli-latest
- Microsoft Learn: Azure Pipelines YAML `pr` trigger schema: https://learn.microsoft.com/en-us/azure/devops/pipelines/yaml-schema/pr?view=azure-pipelines
- Microsoft Learn: Build Azure Repos Git repositories in Azure Pipelines: https://learn.microsoft.com/en-us/azure/devops/pipelines/repos/azure-repos-git?view=azure-devops
- Microsoft Learn: DotNetCoreCLI@2 task reference: https://learn.microsoft.com/en-us/azure/devops/pipelines/tasks/reference/dotnet-core-cli-v2?view=azure-pipelines
- Microsoft Learn: Set Git branch security and permissions: https://learn.microsoft.com/en-us/azure/devops/repos/git/branch-permissions?view=azure-devops

## Issues Found
- The Azure Pipelines YAML example used a `pr:` trigger and described it as running PR validation for Azure Repos. Microsoft documents that YAML PR triggers are supported for GitHub and Bitbucket Cloud, while Azure Repos Git PR validation is triggered through branch build validation policies. I removed the `pr:` block and clarified that the branch policy queues the validation build.
- The post described branch-specific policies as using wildcards such as `release/*`. Azure DevOps CLI policy scope uses `--branch-match-type prefix` for branch folders. I changed the section to describe prefix matching on `release/`.
- The automatic reviewer examples used `**` path patterns. Microsoft branch policy path filter examples use single `*`, and required reviewer documentation states `*` matches characters including slashes. I changed the examples to single `*`.
- The post said automatic reviewer configuration always includes a minimum number of approvals from a group. Microsoft documents that this applies when a single group is required. I narrowed the wording.
- The post stated that every policy override is logged. The official branch policy documentation confirms bypass permissions and that policy status is still evaluated for users with bypass permissions, but did not substantiate that exact logging claim. I changed the wording to avoid overclaiming while keeping the recommendation to review bypass usage.

## Review Notes
The Azure CLI command syntax for `az repos policy approver-count create`, `az repos policy list`, and `az repos show --repository` matches the current Microsoft Learn references. The `DotNetCoreCLI@2` restore, build, and test commands are current. Azure DevOps CLI policy commands are documented for Azure DevOps Services and are not supported for Azure DevOps Server.
