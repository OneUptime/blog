# Validation Summary: How to Use SCM Provider Generator for Azure DevOps

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD ApplicationSet
- SCM Provider generator
- Azure DevOps / Azure Repos
- Kubernetes Secrets
- Argo CD repository credentials
- Azure DevOps REST API

## Sources Consulted
- Argo CD ApplicationSet SCM Provider Generator documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Generators-SCM-Provider/
- Argo CD Private Repositories documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/private-repositories/
- Argo CD repository credential template documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/argocd-repo-creds-yaml/
- Azure DevOps Git Repositories - List REST API documentation: https://learn.microsoft.com/en-us/rest/api/azure/devops/git/repositories/list?view=azure-devops-rest-7.1
- Azure DevOps Personal Access Token authentication documentation: https://learn.microsoft.com/en-us/azure/devops/organizations/accounts/use-personal-access-tokens-to-authenticate

## Issues Found
- The post claimed the Azure DevOps SCM provider could list repositories across an organization or all projects by leaving `teamProject` empty. Argo CD documents `teamProject` as required for the Azure DevOps provider, so the wording was changed to describe scanning a specified organization and team project.
- The basic example described discovering all repositories in an organization. This was corrected to discovering matching repositories in an Azure DevOps team project.
- The basic YAML comment suggested `api: https://dev.azure.com/` under an Azure DevOps Server on-premises note. The comment was corrected to show an on-premises server URL.
- The template parameter list was incomplete and slightly imprecise. It now includes `repository_id`, `short_sha`, `short_sha_7`, and `branchNormalized`, and clarifies that `branch` can be the matched branch when `allBranches` is enabled.
- The `pathsExist` example described multiple paths as an ANY match. Argo CD filters require all conditions in a single filter to pass, and multiple filters are ORed, so the example was corrected to show both all-required paths and separate filters for any-of-several-paths behavior.
- The Azure DevOps REST API test commands used `api-version=7.0`. Microsoft currently documents 7.1 for the Git Repositories List API, so the examples were updated to `api-version=7.1`.

## Review Notes
None.
