# How to Configure Git Webhooks for Auto-Updates in Portainer - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, GitOps, Docker, Webhook, CI/CD

Description: Learn how to set up Git webhooks in Portainer for instant stack redeployment whenever changes are pushed to your repository, enabling real-time GitOps automation.

## Introduction

Git webhooks provide near-instant deployment triggers - when you push to your repository, the Git host immediately calls Portainer's webhook URL, triggering Portainer to check the configured Git reference on demand. This is faster than polling-based updates and the preferred approach when Portainer is reachable from your Git host or CI/CD runner.

## Prerequisites

- Portainer CE or BE
- A Git-connected stack in Portainer
- Portainer accessible via HTTPS from your Git host or CI/CD runner
- Git repository on GitHub, GitLab, Gitea, or similar

## How Webhooks Work

```text
1. Developer pushes commit to Git repository
2. Git host sends POST request to Portainer webhook URL
3. Portainer receives request → checks the latest commit on the configured Git reference
4. If the commit changed, Portainer pulls the repository contents and redeploys the stack
Timing depends on your Git host, network, and Portainer environment
```

## Step 1: Enable Webhook on a Stack

### Via Portainer UI

1. Log into Portainer.
2. Go to **Stacks** and click your Git-connected stack.
3. Click **Edit Git settings**.
4. In **GitOps updates**, enable updates if needed and select **Webhook** as the mechanism.
5. Copy the generated webhook URL - it will look like:
   ```text
   https://portainer.example.com/api/stacks/webhooks/abc123-def456-ghi789
   ```
6. Click **Save settings**.

### Via the API

```bash
PORTAINER_URL="https://portainer.example.com"
API_KEY="your-portainer-api-key"
ENDPOINT_ID=1
STACK_ID=3
WEBHOOK_ID=$(uuidgen)

# Configure the GitOps webhook for the stack

curl -s -X POST \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  "${PORTAINER_URL}/api/stacks/${STACK_ID}/git?endpointId=${ENDPOINT_ID}" \
  -d "{
    \"AutoUpdate\": {
      \"Webhook\": \"${WEBHOOK_ID}\"
    }
  }" | jq .

# Verify the webhook ID saved on the stack
SAVED_WEBHOOK_ID=$(curl -s -H "X-API-Key: $API_KEY" \
  "${PORTAINER_URL}/api/stacks/${STACK_ID}" | jq -r '.AutoUpdate.Webhook // empty')

if [ -n "$SAVED_WEBHOOK_ID" ]; then
  printf '%s/api/stacks/webhooks/%s\n' "$PORTAINER_URL" "$SAVED_WEBHOOK_ID"
else
  echo "No webhook configured"
fi
```

## Step 2: Configure GitHub Webhook

1. Go to your GitHub repository.
2. Click **Settings** → **Webhooks** → **Add webhook**.
3. Configure:
   - **Payload URL**: Your Portainer webhook URL
   - **Content type**: `application/json`
   - **Secret**: Leave this empty for a direct Portainer webhook URL; only set it if you are sending the webhook to middleware that validates GitHub signatures before forwarding to Portainer
   - **Which events**: Select **Just the push event**
4. Ensure **Active** is checked.
5. Click **Add webhook**.

Test it immediately: GitHub sends a `ping` event after creation and shows a delivery history where you can verify the webhook received a 2xx response.

## Step 3: Configure GitLab Webhook

1. Go to your GitLab project → **Settings** → **Webhooks**.
2. Fill in:
   - **URL**: Your Portainer webhook URL
   - **Trigger**: Check **Push events**
   - **Branch filter**: Optional; leave **All branches** selected or use a wildcard/regex that matches your deployment branch
3. Click **Add webhook**.
4. Click **Test** → **Push events** to verify.

## Step 4: Configure Gitea Webhook

1. Go to your Gitea repository → **Settings** → **Webhooks**.
2. Click **Add webhook** → **Gitea**.
3. Set:
   - **Target URL**: Portainer webhook URL
   - **HTTP Method**: POST
   - **POST Content Type**: `application/json`
   - **Trigger on**: Push events
4. Click **Add webhook**.

## Step 5: Filter Webhooks by Branch

By default, your Git provider may send the webhook on every push unless you add host-side filtering. Portainer still checks the stack's configured repository reference and only redeploys when that reference has a new commit. To reduce unnecessary webhook calls, you can use a middleware or configure branch filtering in your CI/CD system:

```yaml
# GitHub Actions approach: only trigger on main branch push
# .github/workflows/portainer-deploy.yml
name: Deploy to Portainer
on:
  push:
    branches: [main]  # Only main branch

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Portainer webhook
        run: |
          curl -fsS -X POST "${{ secrets.PORTAINER_WEBHOOK_URL }}"
          echo "Deployment triggered"
```

This gives you more control than a direct repository webhook.

## Step 6: Secure Your Webhook

The webhook URL itself is the secret - treat it like a password:

```bash
# Store webhook URL in CI/CD secrets
# GitHub: Settings → Secrets → PORTAINER_WEBHOOK_URL
# GitLab: Settings → CI/CD → Variables → PORTAINER_WEBHOOK_URL

# Use from workflow
curl -fsS -X POST "$PORTAINER_WEBHOOK_URL"
```

Rotate the webhook if it's compromised:
1. In Portainer, open the stack's **Edit Git settings** screen.
2. Reconfigure the webhook so it uses a new URL/token.
3. Update the webhook URL in your Git repository settings.

## Step 7: Test the Webhook

```bash
# Manually trigger the webhook to test
WEBHOOK_URL="https://portainer.example.com/api/stacks/webhooks/YOUR_TOKEN"

HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$WEBHOOK_URL")

case "$HTTP_STATUS" in
  2??) echo "Webhook triggered successfully!" ;;
  *) echo "Webhook failed with status: $HTTP_STATUS" ;;
esac
```

## Step 8: Monitor Webhook Activity

```bash
# Check Portainer logs for webhook activity
docker logs <portainer-container-name> 2>&1 | grep -i "webhook" | tail -10

# Exact log messages vary by Portainer version and log level.
```

## Using Polling Instead of Webhooks

If Portainer isn't reachable from your Git host or CI/CD runner, use polling instead:

```bash
# Enable polling every 15m
curl -s -X POST \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  "${PORTAINER_URL}/api/stacks/${STACK_ID}/git?endpointId=${ENDPOINT_ID}" \
  -d '{
    "AutoUpdate": {
      "Interval": "15m",
      "ForceUpdate": false
    }
  }' | jq .
```

Choose the mechanism that fits your environment:
- Polling checks the configured Git reference on a schedule
- Webhook mode triggers the same check on demand

## Conclusion

Git webhooks enable near-instant stack redeployment in Portainer, transforming your Git push into an automated deployment trigger. The setup is straightforward: enable the webhook in Portainer, copy the URL, and add it to your repository settings. For production environments, use webhooks when Portainer is reachable from your Git host or CI/CD runner, use polling when inbound webhook delivery is impractical, and always store webhook URLs securely in your CI/CD secrets manager.
