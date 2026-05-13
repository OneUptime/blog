# Validation Summary: How to Rotate HTTPS Tokens in Flux Without Downtime

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Kubernetes
- kubectl
- Flux CLI
- GitRepository and HelmRepository source-controller resources
- Kubernetes Secrets
- GitHub personal access tokens and GitHub Apps
- GitLab personal access tokens and project access tokens
- Bitbucket app passwords
- Vault-based token automation

## Sources Consulted
- Flux GitRepository documentation: https://fluxcd.io/flux/components/source/gitrepositories/
- Flux HelmRepository documentation: https://fluxcd.io/flux/components/source/helmrepositories/
- Flux CLI `reconcile source git` reference: https://fluxcd.io/flux/cmd/flux_reconcile_source_git/
- Flux CLI `reconcile source helm` reference: https://fluxcd.io/flux/cmd/flux_reconcile_source_helm/
- Kubernetes `kubectl events` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_events/
- GitHub CLI manual for `gh auth token`: https://cli.github.com/manual/gh_help_reference
- GitHub REST API authentication documentation: https://docs.github.com/v3/auth/
- GitHub personal access token documentation: https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens
- GitLab personal access token documentation: https://docs.gitlab.com/user/profile/personal_access_tokens/
- GitLab REST API authentication documentation: https://docs.gitlab.com/api/rest/authentication/
- Bitbucket app password permissions documentation: https://support.atlassian.com/bitbucket-cloud/docs/app-password-permissions/

## Issues Found
- The GitHub PAT generation example used `gh auth token`, which prints the token currently used by GitHub CLI rather than generating a new PAT. Removed the command and kept the web UI instructions for creating a fine-grained PAT.
- The GitHub API verification example used `Authorization: token`. GitHub still accepts this in most cases, but the current REST API docs recommend `Authorization: Bearer`, so the example was updated.
- The Git clone verification example used the GitLab-style `oauth2` username against GitHub. Split the example into separate GitHub and GitLab clone commands with provider-appropriate usernames.
- The GitHub secret guidance said the username is typically `git` or `x-access-token`. Updated it to use the GitHub username or `x-access-token`, matching GitHub's guidance that a username is required but the token performs authentication.
- The GitLab username guidance was too narrow. Updated it to note that personal access tokens accept any non-empty username, while `oauth2` is commonly used for OAuth-style tokens.
- The Step 5 comment said "Reconcile all Git sources" but the command reconciled only the `flux-system` GitRepository. Updated the comment to describe the actual target.
- The Step 8 command used `flux reconcile source git --all`, but the official Flux CLI reference does not provide an `--all` flag for that command. Replaced it with a loop that reconciles each GitRepository by name.
- The CronJob example used `bitnami/kubectl:latest` while invoking the `vault` CLI, which that image should not be assumed to contain. Replaced it with a placeholder custom image name intended to include the required tools.

## Review Notes
Local `flux` and `kubectl` binaries were not available in the workspace, so CLI behavior was checked against official generated command references. The CronJob example remains illustrative and still requires appropriate RBAC for the `flux-token-rotator` service account and an image that contains `kubectl`, `vault`, and a shell.
