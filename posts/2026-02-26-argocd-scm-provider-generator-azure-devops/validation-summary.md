# Validation Summary: How to Use SCM Provider Generator for Azure DevOps in ArgoCD ApplicationSets

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD ApplicationSets
- ApplicationSet SCM provider generator
- Azure DevOps / Azure Repos
- Kubernetes Secrets and ConfigMaps
- kubectl
- Argo CD repository credentials

## Sources Consulted
- Argo CD SCM Provider Generator documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Generators-SCM-Provider/
- Argo CD SCM Provider Generator documentation for v2.7: https://argo-cd.readthedocs.io/en/release-2.7/operator-manual/applicationset/Generators-SCM-Provider/
- Argo CD Private Repositories documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/private-repositories/
- Microsoft Learn, Azure DevOps Git Repositories - List REST API: https://learn.microsoft.com/en-us/rest/api/azure/devops/git/repositories/list?view=azure-devops-rest-7.1
- Microsoft Learn, Use personal access tokens: https://learn.microsoft.com/en-us/azure/devops/organizations/accounts/use-personal-access-tokens-to-authenticate?view=azure-devops

## Issues Found
- The prerequisites said Azure DevOps SCM provider support was added in ArgoCD v2.6. The Argo CD v2.6 SCM provider documentation does not include Azure DevOps, while the v2.7 documentation does. Updated the prerequisite to ArgoCD v2.7 or later.
- The generated parameter table described `organization` as `Organization/project` with an example of `my-org/platform-services`. Official Argo CD docs define `organization` as the organization name only. Updated the description and example to `my-org`.
- The multi-project example said `{{organization}}-{{repository}}` included the project name to avoid collisions. `organization` does not include the team project, so that comment was incorrect. Updated the comment to state that repository names should be unique across scanned projects.
- The PAT rotation script recreated the `azure-devops-repo-creds` secret without ensuring the required `argocd.argoproj.io/secret-type=repo-creds` label. Added a `kubectl label ... --overwrite` command so Argo CD continues to recognize the secret as repository credentials.

## Review Notes
- The Azure DevOps SCM provider fields `organization`, `teamProject`, `api`, `allBranches`, and `accessTokenRef` match the official Argo CD documentation.
- Azure DevOps does not support SCM provider label filtering in Argo CD; the post correctly recommends repository name patterns instead.
- The Azure DevOps REST API currently documents `api-version=7.1`; the post uses `7.0` in debugging examples, which remains plausible for Azure DevOps but could be updated in a future refresh.
