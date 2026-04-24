# How to Redeploy a Stack from a Git Repository in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Stack, Git, GitOps, DevOps

Description: Learn how to connect Portainer stacks to a Git repository and trigger redeployments automatically or manually.

## Introduction

Portainer supports Git-based stack deployments, enabling a GitOps workflow where your Docker Compose files live in version control. You can manually trigger redeployments or configure automatic updates when new commits are pushed. This guide covers setting up and redeploying Git-backed stacks.

## Prerequisites

- Portainer CE 2.x or BE
- A Git repository (GitHub, GitLab, Gitea, etc.) containing a Docker Compose file
- Portainer network access to your Git host

## Step 1: Create a Git-Backed Stack

1. Go to **Stacks > Add stack**
2. Enter a stack name
3. Select **Git Repository**
4. Fill in the repository details:

| Field | Example |
|-------|---------|
| Repository URL | `https://github.com/myorg/myapp.git` |
| Repository reference | `main` |
| Compose path | `docker-compose.yml` or `deploy/compose.yml` |
| Username | Your Git username (if private repo) |
| Personal access token | Your PAT (if private repo) |

5. Click **Deploy the stack**

## Step 2: Understand the Redeployment Options

Portainer provides two redeployment modes:

### Manual Redeployment

Pull the latest commit and redeploy on demand from the Portainer UI.

### Automatic Redeployment (GitOps Updates)

Portainer can automatically redeploy when changes are detected, either by polling the repository or by using a webhook trigger.

## Step 3: Configure Automatic Updates

1. When creating or editing the stack, scroll to **GitOps updates**
2. Enable **GitOps updates**
3. Select **Polling** as the mechanism
4. Set the **Fetch interval** (for example, every 5 minutes)
5. Optionally enable **Re-pull image** to always pull the most recent version of tagged images during an update
6. Optionally enable **Force redeployment** if you want Portainer to redeploy even when no change is detected in Git

Portainer compares the current deployed commit SHA with the latest commit on the configured repository reference. If they differ, redeployment is triggered.

## Step 4: Use Webhook-Based Redeployment

For faster, event-driven updates, use Portainer's GitOps webhook:

1. Go to your stack's detail page
2. Click **Edit Git settings**
3. In **GitOps updates**, select **Webhook** as the mechanism
4. Copy the generated webhook URL:

```text
https://portainer.example.com:9443/api/stacks/webhooks/abc123def456...
```

### Configure the Webhook in GitHub

1. Go to your repository → **Settings → Webhooks → Add webhook**
2. Paste the Portainer webhook URL
3. Set Content type to `application/json`
4. Choose **Just the push event**
5. Click **Add webhook**

Now every push to the repository tells Portainer to check the configured repository reference and redeploy if a new commit is available.

### Trigger Manually via curl

```bash
# Trigger a GitOps redeploy check via webhook

curl -X POST \
  "https://portainer.example.com:9443/api/stacks/webhooks/abc123def456"
```

## Step 5: Manually Redeploy via the UI

1. Navigate to **Stacks**
2. Click on your Git-backed stack
3. Click **Edit Git settings**
4. Click **Pull and redeploy**

Portainer will:
1. Pull the latest commit from the configured repository reference
2. Recreate the stack from the updated Compose definition
3. Pull the latest image for the configured tags if **Re-pull image** is enabled

## Step 6: Pin to a Specific Branch or Tag

To deploy a specific version instead of always tracking the default branch:

1. Edit the stack
2. Change **Repository reference** from `main` to:

```text
v1.2.3         # Pin to a tag
release/1.2    # Track a release branch
```

## Step 7: Use Environment-Specific Compose Files

Structure your repository to support multiple environments:

```text
myapp/
├── docker-compose.yml           # Base configuration
├── docker-compose.prod.yml      # Production overrides
├── docker-compose.staging.yml   # Staging overrides
└── .env.example
```

In Portainer, set the **Compose path** to `docker-compose.yml`, then use **Additional paths** to add `docker-compose.prod.yml` for production or `docker-compose.staging.yml` for staging.

## Security Considerations

- Use **Personal Access Tokens** with repository read permissions instead of passwords
- For self-hosted Git servers with self-signed certificates, only use **Skip TLS verification** when necessary
- Store sensitive values as Portainer environment variables, not in the repository

```yaml
services:
  app:
    image: myapp:latest
    environment:
      - SECRET_KEY=${SECRET_KEY}   # Set in Portainer, not in Git
```

## Conclusion

Git-backed stacks in Portainer bring GitOps principles to Docker-based deployments. Whether you prefer polling-based automatic updates or webhook-triggered redeployments, Portainer makes it easy to keep your stacks in sync with your source code repository. Combine this with environment-specific Compose files for a robust multi-environment deployment workflow.
