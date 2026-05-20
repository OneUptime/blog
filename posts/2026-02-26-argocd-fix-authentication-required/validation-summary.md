# Validation Summary: How to Fix 'authentication required' Error in ArgoCD

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Argo CD
- GitOps
- Kubernetes Secrets
- Git repository authentication
- GitHub personal access tokens and GitHub Apps
- GitLab deploy tokens and project access tokens
- Azure DevOps repositories
- SSH deploy keys
- Bitbucket Cloud and Bitbucket Server

## Sources Consulted
- Argo CD private repositories documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/private-repositories/
- Argo CD declarative setup documentation for repository and repository credential Secrets: https://argo-cd.readthedocs.io/en/latest/operator-manual/declarative-setup/
- GitHub documentation for personal access tokens: https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens
- GitHub documentation for registering GitHub Apps: https://docs.github.com/en/apps/creating-github-apps/registering-a-github-app/registering-a-github-app
- GitLab deploy token documentation: https://docs.gitlab.com/user/project/deploy_tokens/
- Azure Repos authentication overview: https://learn.microsoft.com/en-us/azure/devops/repos/git/auth-overview

## Issues Found
- The post claimed to cover every scenario that causes the error. Changed this to "common scenarios" because Argo CD repository authentication failures can also come from other provider-specific or environment-specific cases.
- The Secret patch example encoded the new token but then patched `stringData`, where the base64 value is not used. Removed the unused encoding command so the example matches Kubernetes `stringData` behavior.
- The GitHub PAT guidance only mentioned the classic `repo` scope. Updated it to clarify that `repo` applies to classic PATs, while fine-grained tokens should have read access to repository contents.
- The self-hosted GitLab custom CA example used `--insecure-skip-server-verification`, which disables TLS verification instead of configuring a custom CA. Replaced it with `argocd cert add-tls gitlab.internal.com --from /path/to/ca.pem` followed by the repository add command.
- The Bitbucket Server HTTP access token example used a service-account username. Updated it to use `x-token-auth`, matching Argo CD's documented access-token authentication pattern for Bitbucket.

## Review Notes
The rest of the Argo CD CLI commands, repository Secret labels (`repository` and `repo-creds`), GitHub App fields, SSH private key guidance, credential template behavior, and verification commands align with the current Argo CD documentation.
