# Validation Summary: How to Rotate Flux CD Git Credentials

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD GitRepository sources and source-controller
- Kubernetes Secrets and CronJobs
- kubectl
- GitHub personal access tokens and GitHub App authentication
- GitLab project access tokens
- Bitbucket Cloud app passwords
- jq and Bash

## Sources Consulted
- Flux GitRepository documentation: https://fluxcd.io/flux/components/source/gitrepositories/
- Flux `flux create secret githubapp` CLI documentation: https://fluxcd.io/flux/cmd/flux_create_secret_githubapp/
- Flux `flux reconcile source git` CLI documentation: https://fluxcd.io/flux/cmd/flux_reconcile_source_git/
- Kubernetes `kubectl create secret generic` reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands
- GitHub personal access token documentation: https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens
- GitHub OAuth app token revocation API documentation: https://docs.github.com/en/rest/apps/oauth-applications
- GitHub App installation authentication documentation: https://docs.github.com/enterprise-cloud@latest/apps/creating-github-apps/authenticating-with-a-github-app/authenticating-as-a-github-app-installation
- GitLab project access tokens API documentation: https://docs.gitlab.com/api/project_access_tokens/
- Bitbucket Cloud app passwords documentation: https://support.atlassian.com/bitbucket-cloud/docs/using-app-passwords/

## Issues Found
- The GitHub PAT section implied `gh auth token` or the GitHub API could create a new fine-grained PAT. Changed it to direct users to create the fine-grained PAT in the GitHub UI, because `gh auth token` only prints the active token and GitHub's documented token management flow is UI-based.
- The GitHub fine-grained PAT examples used a classic PAT-style `ghp_` placeholder. Changed them to `github_pat_` placeholders to match fine-grained personal access tokens.
- The Bitbucket Cloud app password Secret used `x-token-auth` as the username. Changed it to `BITBUCKET_USERNAME`, because Bitbucket Cloud app passwords authenticate with the user's Bitbucket username plus the app password.
- The GitHub App GitRepository example omitted `spec.provider: github`. Added the provider field, because Flux requires the `github` provider for GitHub App authentication.
- The GitHub token revocation example used the OAuth app token revocation endpoint with bearer authentication, which is not the documented way to revoke a personal access token. Removed the API command and kept the GitHub personal access token settings flow.
- The reconciliation comment said the command reconciled all Git sources, but `flux reconcile source git flux-system` reconciles one GitRepository named `flux-system` in the selected namespace. Updated the comment to match the command.

## Review Notes
The remaining commands and configuration examples are technically plausible for current Flux and Kubernetes usage. The multi-secret rotation script assumes all referenced GitRepository Secrets should use the same GitHub-style username and token, so in mixed-provider environments it should be adapted per provider before use.
