# How to Set Up Automated Stack Deployment on Git Push with Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, GitOps, Git, CI/CD, Docker, Automation, Webhook

Description: Learn how to configure Portainer to automatically redeploy stacks when you push changes to a Git repository using webhooks and GitOps workflows.

---

Portainer's GitOps integration lets you link a stack to a Git repository and automatically redeploy when Portainer detects a new commit, either by polling or via webhook. This keeps your deployed stack aligned with the version in Git without requiring manual redeployments. This guide covers both Portainer's built-in Git integration and webhook-based CI/CD triggers.

---

## Approach 1: Portainer Native Git Integration

Portainer supports deploying stacks directly from a Git repository. For webhook-based GitOps triggers, use Portainer Business Edition.

### Link a Stack to a Git Repository

1. In Portainer, go to **Stacks > Add Stack**
2. Select **Git Repository** as the build method
3. Fill in:
   - **Repository URL**: `https://github.com/yourorg/your-infrastructure.git`
   - **Repository reference**: `refs/heads/main`
   - **Compose path**: `stacks/myapp/docker-compose.yml`
4. Optionally load a `.env` file or define environment variables in Portainer
5. Enable **GitOps updates** and choose either polling or webhook as the mechanism
6. Click **Deploy the stack**

### Enable Git Webhook Trigger

When creating the stack, or later from the stack details page, configure the webhook:
1. Enable **GitOps updates**
2. Select **Webhook** as the **Mechanism**
3. Copy the generated webhook URL
4. Use it in GitHub Actions, or add it to your GitHub repo under **Settings > Webhooks > Add webhook** and subscribe to push events

---

## Approach 2: GitHub Actions Webhook Trigger

Trigger a Portainer GitOps update check from a GitHub Actions workflow.

```yaml
# .github/workflows/deploy.yml - deploy to Portainer on push to main

name: Deploy to Portainer

on:
  push:
    branches:
      - main
    paths:
      - "stacks/myapp/**"   # only trigger when stack files change

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Trigger Portainer redeploy via webhook
        run: |
          # Portainer GitOps webhook - triggers a check for the latest Git commit
          curl -X POST \
            "${{ secrets.PORTAINER_WEBHOOK_URL }}" \
            --fail \
            --silent \
            --show-error
```

---

## Approach 3: Portainer API Stack Update from CI

For more control, use the Portainer API to redeploy a Git-based stack from CI with a specific image tag.

```bash
#!/bin/bash
# deploy-to-portainer.sh - redeploy a Git-based stack via Portainer API

set -euo pipefail

PORTAINER_URL="https://portainer.example.com"
API_KEY="${PORTAINER_API_KEY}"
STACK_ID="${PORTAINER_STACK_ID}"
ENDPOINT_ID="${PORTAINER_ENDPOINT_ID}"
IMAGE_TAG="${GITHUB_SHA:-latest}"  # assumes CI published an image tagged with the commit SHA

echo "Deploying stack $STACK_ID with image tag: $IMAGE_TAG"

# Fetch the current stack definition so existing environment variables are preserved
STACK_JSON=$(curl --silent --show-error --fail \
  -H "X-API-KEY: $API_KEY" \
  "$PORTAINER_URL/api/stacks/$STACK_ID")

MERGED_ENV=$(printf '%s' "$STACK_JSON" | IMAGE_TAG="$IMAGE_TAG" python3 -c '
import json, os, sys

stack = json.load(sys.stdin)
env = stack.get("Env") or []
merged = []
found = False

for item in env:
    name = item.get("name") or item.get("Name")
    if not name:
        continue

    value = item.get("value") if "value" in item else item.get("Value")

    if name == "IMAGE_TAG":
        value = os.environ["IMAGE_TAG"]
        found = True

    merged.append({"name": name, "value": value})

if not found:
    merged.append({"name": "IMAGE_TAG", "value": os.environ["IMAGE_TAG"]})

print(json.dumps(merged))
')

# Redeploy the Git-based stack with the merged environment
curl --silent --show-error --fail \
  -X PUT \
  -H "X-API-KEY: $API_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"Env\": $MERGED_ENV, \"RepullImageAndRedeploy\": true}" \
  "$PORTAINER_URL/api/stacks/$STACK_ID/git/redeploy?endpointId=$ENDPOINT_ID"

echo "Stack deployment triggered."
```

---

## Docker Compose for GitOps Deployment

```yaml
# docker-compose.yml - uses IMAGE_TAG env var for automated deployments

services:
  webapp:
    image: myrepo/myapp:${IMAGE_TAG:-latest}
    restart: unless-stopped
    ports:
      - "8080:8080"
    environment:
      APP_ENV: production
      DEPLOYED_AT: ${DEPLOY_TIMESTAMP:-unknown}
```

---

## Summary

Automated stack deployment on Git push requires a Portainer stack linked to a Git repository and a mechanism to trigger a GitOps update check on push - either a Portainer GitOps webhook, a GitHub Actions workflow, or a direct API call. The cleanest approach for teams is Portainer's native Git integration with GitOps updates enabled: merge to main, and Portainer will pull and redeploy when it detects the new commit.
