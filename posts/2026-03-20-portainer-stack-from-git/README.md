# How to Create a Stack from a Git Repository in Portainer - From

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Stack, Git, DevOps

Description: Learn how to deploy Docker Compose stacks directly from a Git repository in Portainer, enabling GitOps workflows with version-controlled configurations.

## Introduction

Deploying stacks from a Git repository is the recommended production approach for Portainer stack management. Your Docker Compose files live in version control, changes are tracked with commit history, and Portainer can automatically poll for updates and redeploy when the repository changes. This enables GitOps workflows where the Git repository is the single source of truth for your infrastructure.

## Prerequisites

- Portainer installed with a connected Docker environment
- A Git repository containing a `docker-compose.yml` file (GitHub, GitLab, Bitbucket, or self-hosted)
- Repository access credentials (for private repos)

## Step 1: Prepare Your Git Repository

Structure your repository to include the Compose file and any supporting configs:

```text
my-app-infra/
├── docker-compose.yml        # Main stack definition
├── docker-compose.prod.yml   # Production overrides (optional)
├── .env.example              # Example environment variables
├── nginx/
│   └── nginx.conf
└── README.md
```

Example `docker-compose.yml` in the repository:

```yaml
services:
  web:
    image: myorg/web:${IMAGE_TAG:-latest}
    restart: unless-stopped
    ports:
      - "80:80"
    networks:
      - app-net
    environment:
      - API_URL=${API_URL}

  api:
    image: myorg/api:${IMAGE_TAG:-latest}
    restart: unless-stopped
    networks:
      - app-net
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}

  postgres:
    image: postgres:15-alpine
    restart: unless-stopped
    networks:
      - app-net
    environment:
      - POSTGRES_PASSWORD=${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data

networks:
  app-net:
    driver: bridge

volumes:
  postgres_data:
```

## Step 2: Prepare Git Credentials (Private Repos)

For private repositories, create credentials Portainer can use to access the repository:

```text
# GitHub:
# Settings → Developer settings → Personal access tokens
# Create a token with read access to the repository

# In Portainer, use:
Username: your-github-username
Personal Access Token: <your-token>

# GitLab, Bitbucket, or self-hosted Git:
# Use the equivalent username + token / app password required by your provider
```

## Step 3: Create the Stack from Git

1. Navigate to **Stacks** → **Add stack**.
2. Enter the stack **Name**: `my-app`.
3. Select **Git repository** as the build method.
4. Configure the Git settings:

```text
Repository URL:        https://github.com/myorg/my-app-infra.git
Repository reference:  refs/heads/main
Compose path:          docker-compose.yml
```

5. For private repositories, enable **Authentication**:
   - Enter your Git username and a personal access token.
   - Or select a saved Git credential if you already have one configured in Portainer.

6. Click **Deploy the stack**.

## Step 4: Set Environment Variables

In the **Environment variables** section below the Git configuration:

```text
IMAGE_TAG        v1.2.3
API_URL          https://api.example.com
DATABASE_URL     postgresql://user:pass@postgres:5432/mydb
DB_PASSWORD      securepassword
REDIS_URL        redis://redis:6379
```

These are supplied by Portainer at deploy time. If the repository also contains a `.env` file, Portainer only uses it for variables you have not already defined in Portainer.

## Step 5: Use a Specific Branch or Tag

Target specific branches or tags for environment-specific deployments:

```text
# For production (from main branch):
Repository reference: refs/heads/main

# For staging (from develop branch):
Repository reference: refs/heads/develop

# For a pinned release:
Repository reference: refs/tags/v1.2.3
```

## Step 6: Enable GitOps Updates (Polling)

For automatic redeployment when the repository changes:

1. In the stack creation form, enable **GitOps updates**.
2. Choose **Polling** and set the fetch interval: `5m` (every 5 minutes).
3. Enable **Re-pull image** if you want Portainer to pull the image again during GitOps-triggered redeploys.

Portainer will check the repository at the interval and redeploy if the latest commit hash for the selected reference has changed.

## Step 7: Verify and Manage

After deployment:

```bash
# On Docker Standalone, check containers are running:
docker ps --filter "label=com.docker.compose.project=my-app"

# View which Git commit is deployed:
# In Portainer: Stacks → my-app → shows current commit SHA

# Trigger a manual update (after pushing to repo):
# Portainer UI: Stacks → my-app → Pull and redeploy
```

## Conclusion

Deploying stacks from Git repositories is the production-grade approach to stack management in Portainer. Your Compose files gain version history, peer review via pull requests, and rollback capability. Combined with Portainer's GitOps updates, your infrastructure automatically stays synchronized with your Git repository - achieving a GitOps workflow without requiring a dedicated CD tool. Use environment variables in Portainer to inject secrets that should not be committed to the repository.
