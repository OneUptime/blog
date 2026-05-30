# Validation Summary: Set Up Azure Repos Branch Protection Rules to Prevent Force Pushes to Main

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Repos
- Azure DevOps branch policies
- Azure DevOps permissions
- Azure Pipelines YAML
- Azure CLI `azure-devops` extension
- Git

## Sources Consulted
- Microsoft Learn: Branch policies - Azure Repos, https://learn.microsoft.com/en-us/azure/devops/repos/git/branch-policies-overview?view=azure-devops
- Microsoft Learn: Git branch policies and settings - Azure Repos, https://learn.microsoft.com/en-us/azure/devops/repos/git/branch-policies?view=azure-devops
- Microsoft Learn: Build Azure Repos Git repositories - Azure Pipelines, https://learn.microsoft.com/en-us/azure/devops/pipelines/repos/azure-repos-git?view=azure-devops
- Microsoft Learn: Azure DevOps permissions reference, https://learn.microsoft.com/en-us/azure/devops/organizations/security/permissions?view=azure-devops
- Microsoft Learn: `az repos policy approver-count`, https://learn.microsoft.com/en-us/cli/azure/repos/policy/approver-count?view=azure-cli-latest

## Issues Found
- The post said enabling any branch policy blocks direct pushes. Microsoft documentation states direct pushes are blocked for branches with required branch policies; optional-only policies do not have the same effect. Updated the wording to say required policy and noted the bypass permission exception.
- The Azure Pipelines YAML example included a `pr:` trigger. Microsoft documentation states YAML PR triggers are not supported for Azure Repos Git; Azure Repos PR validation is configured through branch policies. Removed the `pr:` block and clarified that the build validation policy queues the PR validation run.

## Review Notes
The Azure CLI policy commands and permission names match current Microsoft documentation. The `az repos policy approver-count` example does not configure every UI option mentioned earlier in the article, such as prohibiting the most recent pusher from approving, but the command syntax shown is valid.
