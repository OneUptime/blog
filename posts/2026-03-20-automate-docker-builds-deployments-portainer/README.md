# How to Automate Docker Builds and Deployments with Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker Build, Automation, CI/CD, Stack Webhooks, Docker Hub

Description: Learn how to automate Docker image builds and trigger automatic deployments to Portainer using registry webhooks and the Portainer API.

---

Fully automated Docker deployments involve three components: an automated image build trigger, a registry push, and a Portainer stack redeploy. This guide covers several approaches to connect these pieces.

## Approach 1: Portainer Git-Backed Auto Update

Portainer can poll a Git repository for stack changes and redeploy automatically. This is the simplest zero-CI approach:

1. In Portainer, create a stack from a **Git repository**.
2. Enable **Auto update** and set a polling interval (e.g., every 5 minutes).
3. Commit compose file changes to the repository - Portainer detects and applies them automatically.

For image updates, combine this with a CI step that updates the image tag in the compose file on commit.

## Approach 2: Registry Webhook → Portainer Webhook

Link a Docker Hub webhook to a Portainer stack webhook:

```mermaid
graph LR
    GitPush[Git Push] --> DockerHub[Docker Hub Build]
    DockerHub --> RegistryWebhook[Registry Webhook]
    RegistryWebhook --> PortainerWebhook[Portainer Stack Webhook]
```

Docker Hub webhooks send a POST to a URL when a new image is pushed. Docker Hub automated builds require a Pro, Team, or Business subscription. Portainer stack webhooks can be configured directly as the destination URL in Docker Hub, so a bridge service is not required. Portainer documents stack webhooks as a Business Edition feature on non-Edge environments:

```bash
# Docker Hub sends POST directly to the Portainer stack webhook URL
curl -X POST "$PORTAINER_WEBHOOK_URL"
```

## Approach 3: Full Automation Script

A self-contained build-and-deploy script for use in any CI system or as a cron job when the Portainer stack is deployed from Git:

```bash
#!/bin/bash
set -euo pipefail

REPO_DIR="/opt/my-app"
IMAGE_NAME="myregistry.example.com/my-app"
PORTAINER_URL="https://portainer.example.com"
STACK_NAME="my-app"
PORTAINER_USER="${PORTAINER_USER:-admin}"
PORTAINER_PASSWORD="${PORTAINER_PASSWORD:?PORTAINER_PASSWORD required}"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"; }

# Pull latest code
cd "$REPO_DIR"
git pull origin main

# Build image with build number
BUILD_TAG="$(git rev-parse --short HEAD)"
log "Building $IMAGE_NAME:$BUILD_TAG"
docker build --pull -t "$IMAGE_NAME:$BUILD_TAG" -t "$IMAGE_NAME:latest" .

# Push to registry
docker push "$IMAGE_NAME:$BUILD_TAG"
docker push "$IMAGE_NAME:latest"
log "Pushed $IMAGE_NAME:$BUILD_TAG"

# Authenticate with Portainer
TOKEN=$(curl -s -X POST "$PORTAINER_URL/api/auth" \
  -H "Content-Type: application/json" \
  -d "{\"Username\":\"$PORTAINER_USER\",\"Password\":\"$PORTAINER_PASSWORD\"}" \
  | jq -r .jwt)

if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
  log "ERROR: Failed to authenticate with Portainer"
  exit 1
fi

# Get stack details
STACK_JSON=$(curl -s -H "Authorization: Bearer $TOKEN" \
  "$PORTAINER_URL/api/stacks" | \
  jq -c --arg name "$STACK_NAME" '.[] | select(.Name==$name)' | \
  head -n 1)

if [ -z "$STACK_JSON" ]; then
  log "ERROR: Stack '$STACK_NAME' not found"
  exit 1
fi

STACK_ID=$(jq -r '.Id // empty' <<<"$STACK_JSON")
ENDPOINT_ID=$(jq -r '.EndpointId // empty' <<<"$STACK_JSON")

# Trigger redeploy with image re-pull
REDEPLOY_URL="$PORTAINER_URL/api/stacks/$STACK_ID/git/redeploy"
if [ -n "$ENDPOINT_ID" ]; then
  REDEPLOY_URL="$REDEPLOY_URL?endpointId=$ENDPOINT_ID"
fi

curl -fsS -X PUT \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"RepullImageAndRedeploy":true}' \
  "$REDEPLOY_URL"

log "Deployment triggered for stack $STACK_NAME (ID: $STACK_ID)"
```

## Approach 4: Portainer Access Token for Automation

Use an access token instead of username/password for automation:

```bash
# Create an access token in Portainer:
# My Account > Access Tokens > Add access token

# Use the token directly - no auth step needed
curl -fsS -X PUT \
  -H "X-API-KEY: YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"RepullImageAndRedeploy":true}' \
  "$PORTAINER_URL/api/stacks/$STACK_ID/git/redeploy?endpointId=$ENDPOINT_ID"
```

Access tokens are more secure than passwords in CI because they avoid embedding a user password and can be revoked independently. They inherit the permissions of the Portainer user that created them.

## Watching Deployment Logs

After triggering a redeploy, watch logs to verify the new version started. For Docker Swarm stacks, run this on a Swarm manager node:

```bash
# Wait for the updated service task to start
sleep 5

# Stream the last 50 log lines from the service
docker service logs --follow --tail 50 my-app_api
```

## Scheduling Nightly Rebuilds

Use cron to rebuild and redeploy nightly for base image security updates:

```bash
# /etc/cron.d/nightly-rebuild
0 2 * * * root /opt/scripts/build-and-deploy.sh >> /var/log/deploys.log 2>&1
```

This ensures base image patches (OS updates, library CVEs) are applied regularly even without code changes.
