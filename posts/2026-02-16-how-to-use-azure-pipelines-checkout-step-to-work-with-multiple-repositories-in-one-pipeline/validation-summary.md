# Validation Summary: How to Use Azure Pipelines Checkout Step to Work with Multiple Repositories

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Pipelines YAML
- Azure DevOps multi-repo checkout
- Azure Repos Git repository resources
- GitHub and Bitbucket repository resources
- Git sparse checkout and partial clone
- Azure CLI App Service deployment

## Sources Consulted
- Microsoft Learn: Check out multiple repositories in your pipeline - https://learn.microsoft.com/en-us/azure/devops/pipelines/repos/multi-repo-checkout?view=azure-devops
- Microsoft Learn: steps.checkout definition - https://learn.microsoft.com/en-us/azure/devops/pipelines/yaml-schema/steps-checkout?view=azure-pipelines
- Microsoft Learn: resources.repositories.repository definition - https://learn.microsoft.com/en-us/azure/devops/pipelines/yaml-schema/resources-repositories-repository?view=azure-pipelines
- Microsoft Learn: Build Azure Repos Git repositories - https://learn.microsoft.com/en-us/azure/devops/pipelines/repos/azure-repos-git?view=azure-devops
- Microsoft Learn: Azure CLI az webapp deploy reference - https://learn.microsoft.com/en-us/cli/azure/webapp?view=azure-cli-latest#az-webapp-deploy

## Issues Found
- The default checkout behavior was stated too broadly. Microsoft documents that `checkout: self` is the default for normal jobs, while deployment jobs default to `checkout: none`. Updated the wording to make that distinction clear.
- The sparse checkout section said Azure Pipelines does not have a built-in sparse checkout option. Current Azure Pipelines YAML supports `sparseCheckoutDirectories` and `sparseCheckoutPatterns`, with agent and Git version requirements. Updated the section accordingly.
- The sparse checkout example used `fetchFilter: 'blob:none'` but did not actually configure sparse checkout. Added `sparseCheckoutDirectories: terraform`.
- The manual sparse checkout example embedded `$(System.AccessToken)` in the clone URL. Updated it to pass the OAuth token using Git's `http.extraheader` bearer authorization, which is the safer and more reliable Azure Repos pattern.

## Review Notes
Repository resource triggers are only supported for Azure Repos Git repositories, not GitHub or Bitbucket resources. The post's trigger example uses `type: git`, so it is technically correct. Future updates could mention this limitation near the trigger section for extra clarity.
