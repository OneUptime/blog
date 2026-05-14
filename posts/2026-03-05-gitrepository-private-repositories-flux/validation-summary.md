# Validation Summary: How to Configure GitRepository for Private Repositories in Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Flux source-controller `GitRepository`
- Kubernetes Secrets
- Git over HTTPS
- Git over SSH
- GitHub
- GitLab
- Bitbucket Cloud
- SSH deploy keys and known_hosts

## Sources Consulted
- Flux GitRepository documentation: https://fluxcd.io/flux/components/source/gitrepositories/
- Flux `bootstrap github` CLI documentation: https://fluxcd.io/flux/cmd/flux_bootstrap_github/
- Flux generic Git server bootstrap documentation: https://fluxcd.io/flux/installation/bootstrap/generic-git-server/
- Flux `get sources git` CLI documentation: https://fluxcd.io/flux/cmd/flux_get_sources_git/
- Flux `reconcile source git` CLI documentation: https://fluxcd.io/flux/cmd/flux_reconcile_source_git/
- Flux `create secret git` CLI documentation: https://fluxcd.io/flux/cmd/flux_create_secret_git/
- GitLab personal access token documentation: https://docs.gitlab.com/user/profile/personal_access_tokens/
- GitLab OAuth token documentation: https://docs.gitlab.com/api/oauth2/
- Bitbucket Cloud app passwords documentation: https://support.atlassian.com/bitbucket-cloud/docs/using-app-passwords/
- GitHub personal access token documentation: https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens

## Issues Found
- The GitLab HTTPS section said the username must be `oauth2` when using access tokens. GitLab documents that personal access tokens can use any non-empty username, while OAuth access token examples use `oauth2`. Updated the wording to avoid overstating the requirement.
- The GitHub HTTPS bootstrap example used `--personal` with `--owner=your-org` and omitted `--token-auth`. Flux documents `--personal` for user-owned repositories and `--token-auth` for using the personal access token instead of an SSH deploy key. Replaced `--personal` with `--token-auth`.
- The SSH bootstrap explanation said Flux displays the deploy key for the user to add manually. For `flux bootstrap github`, Flux uses the GitHub API to configure the repository deploy key. Updated the explanation.
- The verification command used `flux get source git`; current Flux CLI documentation uses `flux get sources git`. Updated the command.

## Review Notes
The Flux CLI was not installed in the local workspace, so CLI behavior was validated against the current official Flux CLI documentation instead of local `--help` output. The post's direct Kubernetes Secret examples use current `GitRepository` secret key names (`username`/`password`, `identity`, `known_hosts`, and `caFile`) and the current `source.toolkit.fluxcd.io/v1` API.
