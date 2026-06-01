# Validation Summary: How to Configure Azure Repos Pull Request Templates

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Repos pull request templates
- Azure DevOps branch policies
- Azure Pipelines YAML
- Azure DevOps Git Pull Requests REST API
- Python
- Markdown
- Bash

## Sources Consulted
- Microsoft Learn: Improve pull request descriptions using templates - Azure Repos, https://learn.microsoft.com/en-us/azure/devops/repos/git/pull-request-templates?view=azure-devops
- Microsoft Learn: Build Azure Repos Git or TFS Git repositories - Azure Pipelines, https://learn.microsoft.com/en-us/azure/devops/pipelines/repos/azure-repos-git?view=azure-devops
- Microsoft Learn: Predefined variables - Azure Pipelines, https://learn.microsoft.com/en-us/azure/devops/pipelines/build/variables?view=azure-devops
- Microsoft Learn: Git branch policies and settings - Azure Repos, https://learn.microsoft.com/en-us/azure/devops/repos/git/branch-policies?view=azure-devops
- Microsoft Learn: Pull Requests - Get Pull Request - Azure DevOps Git REST API, https://learn.microsoft.com/en-us/rest/api/azure/devops/git/pull-requests/get-pull-request?view=azure-devops-rest-7.1

## Issues Found
- The default pull request template locations and search order were incorrect. Microsoft documents the order as `.azuredevops`, `.vsts`, `docs`, then repository root, and supports both `.md` and `.txt` template files from the default branch. Updated the list accordingly.
- The article said Azure Repos supports only one default template and suggested linking to extra templates manually. Microsoft documents default, branch-specific, and additional templates, with additional templates located under supported `pull_request_template/` directories and appended through the "Add a template" dropdown. Updated the multiple-template guidance.
- The setup command created only the `.azuredevops` directory, not the template file. Added `touch .azuredevops/pull_request_template.md`.
- The validation script used `System.PullRequest.Description`, which is not a documented Azure Pipelines predefined variable. Replaced it with a script that uses documented PR build variables plus `System.AccessToken` to read the PR description from the Azure DevOps Git Pull Requests REST API.
- The validation YAML used a YAML `pr:` trigger. Microsoft documents that Azure Repos Git PR validation must be configured through branch policies, not YAML PR triggers. Removed the `pr:` block and added a note to configure the pipeline as build validation.
- The post said the PR description field is initially blank. Microsoft documents that templates replace the standard commit-message description normally used by Azure Repos. Updated the explanation.

## Review Notes
The corrected validation script is intentionally minimal and uses Python standard-library modules so it does not require installing `requests` in the pipeline. The article remains a practical guide rather than a complete reference; future improvements could add branch-specific template examples, but the current technical claims and examples are now accurate.
