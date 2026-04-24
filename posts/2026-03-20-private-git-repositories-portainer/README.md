# How to Use Private Git Repositories with Portainer - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Git, Private Repository, Authentication, GitOps

Description: Learn how to configure Portainer to authenticate with private Git repositories for stack deployments.

## Overview

When your Compose files or Kubernetes manifests live in private Git repositories, Portainer needs credentials to clone and fetch them. Portainer's documented Git-backed deployment flow uses Git credentials over HTTPS, typically with a username and token.

## Method 1: Token-Based Authentication (Recommended)

Most Git providers support token-based authentication where you use a generated token as the password.

### GitHub

```bash
# Create a Personal Access Token in GitHub:

# Settings > Developer settings > Personal access tokens > Fine-grained tokens
# Grant: Contents (Read-only) for the specific repository

# Use in Portainer:
# Username: your-github-username
# Personal Access Token: github_pat_XXXXXXXXXXXX
```

### GitLab

```bash
# Create a Deploy Token in GitLab:
# Project > Settings > Repository > Deploy tokens
# Scope: read_repository

# Use in Portainer:
# Username: (the deploy token username, e.g., gitlab+deploy-token-123)
# Personal Access Token: (the deploy token value)
```

### Bitbucket

```bash
# Create an API token in Bitbucket Cloud:
# Personal settings > API tokens
# Permission: Repositories > Read
#
# Note: App passwords can no longer be created and
# existing app passwords stop working on June 9, 2026.

# Use in Portainer:
# Username: your-bitbucket-username
# Personal Access Token: the-api-token
```

## Configuring Credentials in Portainer

When adding a Git-backed stack:

1. Toggle **Authentication** to On.
2. Either select an existing entry from **Git Credentials**, or leave it blank to enter new credentials.
3. For GitHub, GitLab, and Bitbucket Cloud, select **Basic** as the **Authorization type**.
4. Enter:
   - **Username**: Your username or token username.
   - **Personal Access Token**: Your personal, deploy, or API token.
5. Optionally save the credentials for reuse.

## Repository URL Formats

```bash
# HTTPS (for token-based auth in Portainer)
https://github.com/myorg/my-repo.git
https://gitlab.com/mygroup/my-project.git
https://bitbucket.org/myworkspace/my-repo.git

# Self-hosted GitLab
https://gitlab.mycompany.com/team/project.git
```

## Saving Credentials for Multiple Stacks

Portainer Business Edition lets you save credentials and reuse them across multiple stacks. Administrators can also create shared Git credentials under **Settings > Shared credentials**.

1. Go to **My account > Git credentials**.
2. Add a named credential set.
3. Reference it when creating each Git-backed stack.

## Testing Access Before Deployment

```bash
# Test Git access before configuring Portainer
git clone https://github.com/myorg/private-repo.git --depth=1 /tmp/test-clone
# Use your token as the password when prompted
```

## Conclusion

Private Git repository integration in Portainer is straightforward with token-based authentication over HTTPS. Use deploy tokens, API tokens, or scoped personal access tokens rather than personal passwords to follow the principle of least privilege.
