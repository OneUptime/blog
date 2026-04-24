# How to Deploy Stacks from a Git Repository in Portainer - From

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Stack, GitOps, Automation

Description: Learn how to deploy Docker Compose stacks directly from a Git repository in Portainer, including configuration options for branch selection, compose file paths, and authentication.

## Introduction

Portainer allows you to deploy stacks directly from Git repositories, eliminating the need to copy-paste Compose file content into the UI. This approach keeps your stack definition in version control, enables collaboration, and supports GitOps workflows where the repository is the source of truth.

## Prerequisites

- Portainer CE or BE with a Docker or Swarm environment
- A Git repository containing a Docker Compose file
- For private repos: repository access credentials

## Step 1: Prepare Your Repository

Create a repository with your Compose files. Portainer supports any Git host:
- GitHub
- GitLab (cloud or self-hosted)
- Bitbucket
- Gitea
- Azure DevOps

Example repository structure:

```text
infrastructure/
├── stacks/
│   ├── wordpress/
│   │   └── docker-compose.yml
│   ├── monitoring/
│   │   └── docker-compose.yml
│   └── databases/
│       └── docker-compose.yml
└── README.md
```

## Step 2: Navigate to Stack Creation

1. Log into Portainer.
2. Select your Docker environment.
3. Go to **Stacks** → **Add stack**.
4. Enter a **Stack name** (e.g., `wordpress-production`).

## Step 3: Configure Git Repository Source

Under **Build method**, select **Git repository**.

Fill in the repository details:

### Repository URL Formats

```text
# GitHub

https://github.com/your-org/infrastructure.git

# GitLab
https://gitlab.com/your-org/infrastructure.git

# Gitea (self-hosted)
https://git.company.com/devops/infrastructure.git
```

### Repository Reference

Specify which branch or tag to deploy from. Portainer expects Git refs such as:

```text
# Branch
refs/heads/main
refs/heads/production
refs/heads/v2-release

# Tag
refs/tags/v1.2.3
```

### Compose File Path

Specify the path to your Compose file within the repository:

```text
# If docker-compose.yml is at the root
docker-compose.yml

# If in a subdirectory
stacks/wordpress/docker-compose.yml

# If using a different filename
compose/production.yaml
```

## Step 4: Configure Authentication for Private Repos

For private repositories, enable **Authentication**:

### Username/Password or Personal Access Token

- **Authorization type**: If your Portainer version shows this field, choose the mode your Git host expects. GitHub, GitLab, and Bitbucket Cloud use **Basic** authorization in Portainer even when you authenticate with a token.
- **Username**: Your Git username or service account
- **Password/Token**:
  - GitHub: Personal Access Token (classic) with the repository permissions required for private repository access
  - GitLab: Personal Access Token with `read_repository` scope
  - Bitbucket Cloud: token or app password with `Repository: Read`
  - Azure DevOps: Personal Access Token with `Code: Read`

## Step 5: Configure Environment Variables

Add environment variables that the Compose file references:

```yaml
# In your docker-compose.yml, reference variables:
services:
  wordpress:
    image: wordpress:${WP_VERSION:-latest}
    environment:
      WORDPRESS_DB_HOST: ${DB_HOST}
      WORDPRESS_DB_PASSWORD: ${DB_PASSWORD}  # Set in Portainer, not in repo!
```

In Portainer, add the environment variables in the **Environment variables** section:
- `DB_HOST` = `db.example.com`
- `DB_PASSWORD` = `[your secure password]`
- `WP_VERSION` = `6.4`

## Step 6: Deploy the Stack

1. Review all settings.
2. Click **Deploy the stack**.

Portainer will:
1. Clone the entire repository
2. Read the Compose file at the specified path
3. Deploy the stack on your Docker environment

## Step 7: View and Manage the Deployed Stack

After deployment:

1. Go to **Stacks** to see your stack listed.
2. Click the stack name to see:
   - **Stack status**: Running/stopped
   - **Git info**: Repository URL, repository reference, compose file path, current commit hash
   - **Services/containers**: List of deployed services

## Step 8: Update a Git-Connected Stack

To pull the latest changes from the repository:

1. Click on the stack.
2. Click **Pull and redeploy**.

Or configure automatic updates (see the separate guides on polling and webhooks).

### Via the API

```bash
STACK_ID=3
ENDPOINT_ID=1

# Force a git pull and redeploy
curl -s -X PUT \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  "https://portainer.example.com/api/stacks/${STACK_ID}/git/redeploy?endpointId=${ENDPOINT_ID}" \
  -d '{
    "repullImageAndRedeploy": true,
    "prune": false
  }' | jq .
```

## Step 9: Change the Branch

To deploy from a different branch:

1. Click on the stack.
2. Click **Edit Git settings**.
3. Change the **Repository reference** to the new branch.
4. Check **Redeploy** if you want the stack updated immediately, then click **Save settings**.

## Conclusion

Deploying stacks from Git repositories in Portainer brings your container infrastructure under version control with minimal effort. Configure the repository URL, branch reference, and Compose file path once, and your stack stays in sync with your repository. Combine with branch-based environments (main → production, develop → staging) for a complete GitOps workflow that your team can manage through familiar Git practices.
