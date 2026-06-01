# Validation Summary: How to Configure Azure Pipelines to Trigger on Specific File Path Changes

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Pipelines YAML
- Azure Pipelines CI and PR triggers
- Azure Repos Git, GitHub, and Bitbucket Cloud PR validation behavior
- Azure Pipelines checkout, shallow fetch, and sparse checkout
- Azure CLI and Bicep validation in AzureCLI@2
- .NET and Node.js build/test commands

## Sources Consulted
- Microsoft Learn: Azure Pipelines `trigger` YAML schema - https://learn.microsoft.com/en-us/azure/devops/pipelines/yaml-schema/trigger?view=azure-pipelines
- Microsoft Learn: Azure Pipelines `pr` YAML schema - https://learn.microsoft.com/en-us/azure/devops/pipelines/yaml-schema/pr?view=azure-pipelines
- Microsoft Learn: Specify events that trigger pipelines - https://learn.microsoft.com/en-us/azure/devops/pipelines/build/triggers?view=azure-devops
- Microsoft Learn: Build Azure Repos Git repositories - https://learn.microsoft.com/en-us/azure/devops/pipelines/repos/azure-repos-git?view=azure-devops
- Microsoft Learn: Azure Pipelines `steps.checkout` YAML schema - https://learn.microsoft.com/en-us/azure/devops/pipelines/yaml-schema/steps-checkout?view=azure-pipelines
- Microsoft Learn: Azure Pipelines `extends` YAML schema - https://learn.microsoft.com/en-us/azure/devops/pipelines/yaml-schema/extends?view=azure-pipelines
- Microsoft Learn: Azure CLI v2 task reference - https://learn.microsoft.com/en-us/azure/devops/pipelines/tasks/reference/azure-cli-v2?view=azure-pipelines
- Microsoft Learn: Azure CLI `az bicep` command reference - https://learn.microsoft.com/en-us/cli/azure/bicep?view=azure-cli-latest

## Issues Found
- The PR trigger section implied YAML `pr` triggers apply generally to Azure Pipelines. Updated it to note that YAML PR triggers are supported for GitHub and Bitbucket Cloud, while Azure Repos Git uses branch policies for PR build validation.
- The initial-run edge case said path triggers run when there is no previous commit to compare against. Replaced this with Azure Pipelines' documented behavior for newly pushed branches with path filters.
- The multiple-path edge case said matching pipelines run in parallel by default. Clarified that they can run concurrently subject to available Azure DevOps parallel jobs.
- The pipeline-file edge case said YAML file changes always trigger the pipeline regardless of path filters. Corrected it to say YAML file changes do not bypass path filters and should be included explicitly if desired.
- The merge-commit explanation made a specific first-parent diff claim that was not supported by the consulted Microsoft documentation. Replaced it with repository-type-specific trigger behavior.
- The shallow clone section described full clone as the default. Updated it to account for current Azure DevOps behavior, where newer pipelines in some organizations may already use shallow fetch with depth 1.
- The sparse checkout example ran `git sparse-checkout` after the checkout step and described it as reducing fetched files. Updated the example to use the official `sparseCheckoutDirectories` checkout property and added the documented agent/Git version requirement.
- The `extends` example referenced `templates/service-ci.yml` from a pipeline located under `pipelines/`. Updated it to `../templates/service-ci.yml` so the relative path matches the directory structure shown in the post.
- The introductory path example used `/services/api`, which could be read as an absolute path. Updated it to `services/api` to match Azure Pipelines' repository-root-relative path filter model.

## Review Notes
The remaining examples are illustrative and depend on project-specific service connection names, resource groups, project layout, and package scripts. The AzureCLI@2, `az bicep build`, and `az deployment group what-if` syntax matched the official references reviewed.
