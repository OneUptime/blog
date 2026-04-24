# How to Set Up Stack Auto-Updates from Git in Portainer (Polling)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Stack, GitOps, Auto-Update, DevOps

Description: Learn how to configure Portainer to automatically poll a Git repository and redeploy your stack when the Compose file changes.

## Introduction

Portainer's Git polling auto-update feature checks your repository at a defined interval and automatically redeploys the stack when the commit hash changes. This creates a lightweight GitOps workflow: push a change to Git, and Portainer picks it up within the polling interval without any manual intervention. This approach is simple to configure and works with any Git provider, requiring no webhooks or special repository settings.

## Prerequisites

- A supported Portainer CE or BE release
- A Git repository with a Docker Compose file
- The stack deployed from Git in Portainer

## How Polling Auto-Update Works

```text
1. Portainer checks the Git repo every N minutes
2. Compares current commit SHA to the deployed commit SHA
3. If different: pulls the new Compose file and redeploys
4. Services with changed definitions are recreated
5. Unchanged services continue running
```

## Step 1: Create a Git-Based Stack with Polling Enabled

1. Navigate to **Stacks** → **Add stack**.
2. Select **Git Repository** as the build method.
3. Configure Git settings:

```text
Repository URL:  https://github.com/myorg/my-infra
Repository ref:  main
Compose path:    docker-compose.yml
```

4. Under **GitOps updates**, enable the toggle.
5. Select **Polling** as the mechanism and set **Fetch interval**: `5m` (5 minutes), `15m`, `1h`, etc.
6. Optionally enable **Re-pull image** to always pull the latest image whenever the stack is updated.
7. Click **Deploy the stack**.

## Step 2: Enable Polling on an Existing Git Stack

For an already-deployed Git stack:

1. Navigate to **Stacks** → click the stack name.
2. At the bottom of the **Stack details** view, click **Edit Git settings**.
3. Under **GitOps updates**, select **Polling**.
4. Set the **Fetch interval**.
5. Optionally check **Redeploy** if you want the stack to redeploy immediately, then click **Save settings**.

## Step 3: Configure the Polling Interval

Choose an interval based on how quickly you need changes deployed:

```text
1m  - Near real-time (high API usage for large fleets)
5m  - Standard for most development workflows
15m - Balanced for stable services
1h  - Production services with infrequent changes
24h - Very stable configurations
```

Portainer checks each configured stack separately. With many stacks and short intervals, monitor the load on both Portainer and your Git host and increase the interval if needed.

## Step 4: Trigger a Deployment by Pushing to Git

To test the polling update:

```bash
# Make a change to the Compose file:

cd my-infra/
# Edit docker-compose.yml - e.g., update IMAGE_TAG

# Commit and push:
git add docker-compose.yml
git commit -m "Update API image to v1.3.0"
git push origin main

# Portainer will detect the change within the polling interval
# and automatically redeploy the stack
```

## Step 5: Use Re-Pull Image with Polling

Enable **Re-pull image** if you want Portainer to pull the latest image whenever a redeploy is triggered:

```yaml
# Compose file uses mutable tag:
services:
  api:
    image: myorg/api:latest   # Tag doesn't change, but digest might
```

With **Re-pull image** enabled:
- When polling detects a new Git commit and triggers an update, Portainer pulls the image again as part of that update.
- If the tag now points to a different digest, the service can be recreated with the newer image.
- By itself, **Re-pull image** does not make Portainer redeploy when only the registry image changes and the Git commit stays the same. For that, you also need a Git change or **Force redeployment**.

For production, prefer immutable tags and update the tag in Git:

```yaml
# Better practice: update the tag in Git to trigger redeployment
services:
  api:
    image: myorg/api:${IMAGE_TAG:-latest}
```

Change the image tag in the Compose file, commit, and push.

## Step 6: Monitor Auto-Update Activity

Check what Portainer deployed and when:

1. In Portainer, navigate to **Stacks** → click the stack name.
2. Click **Edit Git settings** to review the repository details and GitOps configuration.
3. Compare the latest Git commit on the configured branch with the stack details Portainer shows to confirm it's up to date. If your Portainer UI shows the deployed commit, the SHAs should match.

```bash
# Get latest commit SHA on main branch:
git ls-remote https://github.com/myorg/my-infra refs/heads/main

# Compare with what Portainer shows in the UI
```

## Step 7: Handle Polling for Multiple Environments

Deploy the same repo to multiple environments with different branches:

```text
Stack: myapp-production
  Branch: main
  Polling: 15m
  Re-pull image: false

Stack: myapp-staging
  Branch: develop
  Polling: 5m
  Re-pull image: true  (pull the tag again on each redeploy)
```

Push to `develop` → staging updates within 5 minutes.
Merge PR to `main` → production updates within 15 minutes.

## Conclusion

Git polling auto-updates in Portainer provide a lightweight GitOps workflow - no webhooks to set up, no CI/CD pipeline changes required. Set a polling interval, push to Git, and Portainer handles the rest. The trade-off is latency: changes take up to the interval duration to deploy. For faster deployments, use the webhook-based auto-update method instead. Use polling for stable services and environments where the interval latency is acceptable, and use **Re-pull image** when you want updated tags fetched during a redeploy. If you need redeployments even when Git hasn't changed, enable **Force redeployment** as well.
