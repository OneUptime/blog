# How to Set Up GitOps Deployments with Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, GitOps, Docker, Automation, CI/CD

Description: Learn how to implement GitOps deployments with Portainer by connecting stacks directly to Git repositories for automatic synchronization when code changes are pushed.

## Introduction

GitOps is a practice where your Git repository is the single source of truth for infrastructure and application configuration. Portainer supports GitOps natively by allowing stacks to be directly connected to Git repositories. When you push changes to your repository, Portainer can automatically detect the change and redeploy your stack.

## Prerequisites

- Portainer CE or BE
- A Git repository (GitHub, GitLab, Bitbucket, or self-hosted)
- Docker Compose file(s) in the repository
- Admin or stack-management access to Portainer

## GitOps Workflow with Portainer

```text
Developer pushes to Git → Portainer polls/webhook → Stack updated automatically
                                                   ↓
                                          Container restarted with new config/image
```

## Step 1: Prepare Your Git Repository

Structure your repository for Portainer GitOps:

```text
my-app-infra/
├── production/
│   ├── docker-compose.yml      # Production stack definition
│   └── .env                    # Non-secret environment variables
├── staging/
│   └── docker-compose.yml      # Staging stack definition
└── README.md
```

Example `docker-compose.yml` for GitOps:

```yaml
# production/docker-compose.yml

services:
  web:
    image: myregistry.io/myapp:${IMAGE_TAG:-latest}
    restart: unless-stopped
    ports:
      - "80:8080"
    environment:
      NODE_ENV: production
      APP_VERSION: ${IMAGE_TAG:-latest}
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  cache:
    image: redis:7-alpine
    restart: unless-stopped
    volumes:
      - redis_data:/data

volumes:
  redis_data:
```

## Step 2: Deploy a Stack from Git

1. Log into Portainer.
2. Select your environment.
3. Go to **Stacks** → **Add stack**.
4. Enter a **Stack name**: `my-app-production`
5. Under **Build method**, select **Git repository**.
6. Fill in:
   - **Repository URL**: `https://github.com/your-org/my-app-infra`
   - **Repository reference**: `refs/heads/main`
   - **Compose path**: `production/docker-compose.yml`
7. If private repo, enable **Authentication** and add credentials.
8. Click **Deploy the stack**.

## Step 3: Use Polling for Automatic Updates

To have Portainer automatically detect changes:

1. After deploying the stack, click on it.
2. Find the **GitOps updates** section.
3. Choose **Polling** as the update **Mechanism**.
4. Set the polling interval (e.g., `5m` for every 5 minutes).
5. Optionally enable **Force redeployment** to always redeploy even if no changes detected.

## Step 4: Or Use Webhook Auto-Updates

For instant updates on push instead of polling:

1. In the stack settings, choose **Webhook** as the update **Mechanism**.
2. Copy the generated webhook URL.
3. Add this URL to your Git repository's webhook settings.

### GitHub Webhook Setup

1. Go to your GitHub repository → **Settings** → **Webhooks**.
2. Click **Add webhook**.
3. Paste the Portainer webhook URL in **Payload URL**.
4. Set **Content type** to `application/json`.
5. Select **Just the push event**.
6. Click **Add webhook**.

## Step 5: Using Environment Variables from Git

Store non-sensitive environment variables in your repo:

```bash
# .env (committed to repo - no secrets!)
APP_NAME=myapp
APP_ENV=production
LOG_LEVEL=info
MAX_CONNECTIONS=100
```

For Git-based stacks, keep this file named `.env` alongside your Compose file so Portainer can process it during deployment if you have not already defined environment variables in Portainer.

In Portainer stack settings:
- Add sensitive variables (passwords, API keys) directly in Portainer's **Environment variables** section - these won't be stored in Git

## Step 6: GitOps via the Portainer API

Deploy a Git-connected stack programmatically:

```bash
TOKEN=$(curl -s -X POST https://portainer.example.com/api/auth \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"password"}' | jq -r '.jwt')

ENDPOINT_ID=1

# Create a stack from a Git repository
curl -s -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  "https://portainer.example.com/api/stacks/create/standalone/repository?endpointId=${ENDPOINT_ID}" \
  -d '{
    "name": "my-app-production",
    "repositoryURL": "https://github.com/your-org/my-app-infra",
    "repositoryReferenceName": "refs/heads/main",
    "composeFile": "production/docker-compose.yml",
    "autoUpdate": {
      "interval": "5m"
    },
    "env": [
      {"name": "IMAGE_TAG", "value": "v1.2.3"}
    ]
  }' | jq .
```

## Step 7: Rolling Back to a Previous Git Commit

If a deployment causes issues:

1. In Portainer, go to the stack.
2. Review the current commit hash in the **Managed by Git** section.
3. To roll back, revert the commit in Git and push it to the tracked branch (Portainer will detect and redeploy).

```bash
# Revert and push in Git
git revert HEAD
git push origin main
# Portainer will detect the change and redeploy
```

## Conclusion

GitOps with Portainer connects your infrastructure configuration directly to Git, making deployments declarative, auditable, and reversible. Start with polling-based updates for simplicity, or use webhook-based triggers for near-instant deployments. Store non-secret configuration in a `.env` file in your Git repository and manage secrets through Portainer's environment variable injection to maintain the benefits of GitOps without compromising security.
