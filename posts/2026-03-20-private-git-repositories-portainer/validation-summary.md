# Validation Summary: How to Use Private Git Repositories with Portainer - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Git
- GitHub
- GitLab
- Bitbucket Cloud
- HTTPS token authentication
- GitOps

## Sources Consulted
- Portainer docs: Add a new stack - https://docs.portainer.io/sts/user/docker/stacks/add
- Portainer docs: Add Git credentials - https://docs.portainer.io/sts/admin/settings/credentials/git
- Portainer docs: Account settings - https://docs.portainer.io/user/account-settings
- Portainer docs: Add SSH credentials - https://docs.portainer.io/admin/settings/credentials/ssh
- Portainer docs: What scopes are required for GitHub, GitLab and Bitbucket tokens? - https://docs.portainer.io/faqs/getting-started/what-scopes-are-required-for-github-gitlab-and-bitbucket-tokens
- GitHub Docs: Managing your personal access tokens - https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens
- GitHub Docs: About remote repositories - https://docs.github.com/en/get-started/git-basics/about-remote-repositories
- GitLab Docs: Deploy tokens - https://docs.gitlab.com/user/project/deploy_tokens/
- Atlassian Support: Using API tokens - https://support.atlassian.com/bitbucket-cloud/docs/using-api-tokens/
- Atlassian Support: Revoke an App password - https://support.atlassian.com/bitbucket-cloud/docs/revoke-an-app-password/
- Git documentation: git-clone - https://git-scm.com/docs/git-clone.html

## Issues Found
- The post claimed Portainer Git-backed deployments support SSH key authentication. I removed the SSH section and SSH URL examples because Portainer's documented Git-backed stack flow uses Git credentials over HTTPS, while Portainer's SSH credentials documentation is for Kubernetes provisioning rather than Git-backed stack access.
- The Bitbucket section recommended app passwords. I updated it to Bitbucket Cloud API tokens because Atlassian stopped allowing new app password creation on September 9, 2025, and existing app passwords are scheduled to stop working on June 9, 2026.
- The Portainer setup steps used outdated or imprecise UI wording. I corrected them to the current Git-backed flow: `Git Credentials`, `Authorization type`, and `Personal Access Token`, and updated the saved-credentials path to `My account > Git credentials` with the admin shared-credentials location noted separately.
- The authentication heading implied every provider used a personal access token. I renamed it to token-based authentication because the post also covers GitLab deploy tokens and Bitbucket API tokens.

## Review Notes
- Portainer's current stack documentation states that GitHub, GitLab, and Bitbucket Cloud use Basic authentication even when the secret itself is a token.
- Saved per-user Git credentials are a Portainer Business Edition feature. Shared Git credentials are admin-scoped.
- Reviewed against current official documentation on 2026-04-24.
