# Validation Summary: How to Use ArgoCD with multiple Git repositories using repository credentials

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Kubernetes Secrets
- Git repository authentication
- SSH keys
- HTTPS personal access tokens and app passwords
- Argo CD Application multi-source configuration
- External Secrets Operator
- Argo CD AppProject access controls

## Sources Consulted
- Argo CD Declarative Setup documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/declarative-setup/
- Argo CD repository credential template documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/declarative-setup/#repository-credentials
- Argo CD multiple sources documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/multiple_sources/
- Argo CD `argocd repo add` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_repo_add/
- Argo CD `argocd repocreds` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_repocreds/
- Argo CD Project specification reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/project-specification/
- External Secrets Operator ExternalSecret API documentation: https://external-secrets.io/v0.18.0/api/externalsecret/
- GitHub personal access token documentation: https://docs.github.com/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token
- GitLab personal access token documentation: https://docs.gitlab.com/user/profile/personal_access_tokens/
- Bitbucket Cloud app password documentation: https://support.atlassian.com/bitbucket-cloud/docs/using-app-passwords/

## Issues Found
- The HTTPS token section stated that the username is typically ignored for token authentication. Updated this to use the username expected by the Git provider, because GitHub, GitLab, and Bitbucket have provider-specific HTTPS authentication requirements.
- The multi-source Application example used a separate `helm-values` repository without the required Argo CD `ref` and `$values/...` syntax, so it would not supply values to another source. Updated the example to use a Helm chart source with `$values/production-values.yaml` and a second source with `ref: values`.
- The repository management section claimed repositories can be managed declaratively using a Repository CRD. Argo CD repository configuration is not managed through a Repository CRD; current declarative setup uses Kubernetes Secrets for repository definitions and repository credential templates. Updated the wording accordingly.
- The credential precedence section described an oversimplified exact-match order. Updated it to explain that repository credential templates apply only when a repository is not configured or has no credential fields, and that the longest matching template URL prefix takes precedence.

## Review Notes
The local `argocd` CLI was not installed in the review environment, so CLI command validation was performed against the official Argo CD command reference. The post does not pin an Argo CD version; the review used current stable/latest Argo CD documentation available on 2026-06-04.
