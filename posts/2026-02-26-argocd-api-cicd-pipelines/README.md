# How to Use ArgoCD API in CI/CD Pipelines

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, CI/CD, API

Description: Learn how to use the ArgoCD REST API in CI/CD pipelines to trigger syncs, check application status, manage deployments, and automate GitOps workflows programmatically.

---

The ArgoCD REST API gives you programmatic control over every aspect of ArgoCD. In CI/CD pipelines, this API becomes essential for triggering syncs after image builds, checking deployment status before proceeding, and integrating ArgoCD with tools that do not have native support. This guide covers the most useful API endpoints for CI/CD automation.

## Authentication with the ArgoCD API

Before making any API calls, you need an authentication token. There are two main approaches: using account tokens for service accounts and using project tokens for scoped access.

### Generating an API Token

Create a dedicated service account for your CI/CD pipeline:

```bash
# Create an API token for a local account named 'ci-bot'
# First, ensure the account exists in argocd-cm ConfigMap
kubectl patch configmap argocd-cm -n argocd --type merge -p '{
  "data": {
    "accounts.ci-bot": "apiKey"
  }
}'

# Set RBAC permissions for the ci-bot account
kubectl patch configmap argocd-rbac-cm -n argocd --type merge -p '{
  "data": {
    "policy.csv": "p, ci-bot, applications, sync, */*, allow\np, ci-bot, applications, get, */*, allow\n"
  }
}'

# Generate the token
argocd account generate-token --account ci-bot
```

### Using Project Tokens

For more scoped access, use project-level tokens:

```bash
# Create a project role with limited permissions
argocd proj role create my-project ci-role

# Add permissions to the role
argocd proj role add-policy my-project ci-role \
  --action get --permission allow --object "my-app-*"
argocd proj role add-policy my-project ci-role \
  --action sync --permission allow --object "my-app-*"

# Generate a token for the role
argocd proj role create-token my-project ci-role
```

## Core API Endpoints for CI/CD

### Getting Application Status

The most common API call in CI/CD is checking an application's sync and health status.

```bash
# Get full application details
curl -s \
  -H "Authorization: Bearer $ARGOCD_TOKEN" \
  "https://$ARGOCD_SERVER/api/v1/applications/my-app" | \
  jq '{sync: .status.sync.status, health: .status.health.status}'
```

Example response:

```json
{
  "sync": "Synced",
  "health": "Healthy"
}
```

### Triggering a Sync

Trigger a sync operation for an application:

```bash
# Trigger a sync
curl -s -X POST \
  -H "Authorization: Bearer $ARGOCD_TOKEN" \
  -H "Content-Type: application/json" \
  "https://$ARGOCD_SERVER/api/v1/applications/my-app/sync" \
  -d '{
    "revision": "main",
    "prune": true,
    "strategy": {
      "apply": {
        "force": false
      }
    }
  }'
```

### Waiting for Sync Completion

Poll the application status until the sync completes:

```bash
#!/bin/bash
# wait-for-sync.sh - Wait for ArgoCD sync to complete

ARGOCD_SERVER="$1"
APP_NAME="$2"
TIMEOUT="${3:-300}"
INTERVAL=10
ELAPSED=0

while [ $ELAPSED -lt $TIMEOUT ]; do
  # Fetch current status
  RESPONSE=$(curl -s \
    -H "Authorization: Bearer $ARGOCD_TOKEN" \
    "https://$ARGOCD_SERVER/api/v1/applications/$APP_NAME")

  SYNC_STATUS=$(echo "$RESPONSE" | jq -r '.status.sync.status')
  HEALTH_STATUS=$(echo "$RESPONSE" | jq -r '.status.health.status')
  OPERATION_PHASE=$(echo "$RESPONSE" | jq -r '.status.operationState.phase // "none"')

  echo "Sync: $SYNC_STATUS | Health: $HEALTH_STATUS | Operation: $OPERATION_PHASE"

  # Check if sync succeeded
  if [ "$SYNC_STATUS" = "Synced" ] && [ "$HEALTH_STATUS" = "Healthy" ]; then
    echo "Application is synced and healthy"
    exit 0
  fi

  # Check if sync failed
  if [ "$OPERATION_PHASE" = "Failed" ] || [ "$OPERATION_PHASE" = "Error" ]; then
    echo "Sync failed!"
    # Print the error message
    echo "$RESPONSE" | jq -r '.status.operationState.message'
    exit 1
  fi

  sleep $INTERVAL
  ELAPSED=$((ELAPSED + INTERVAL))
done

echo "Timeout waiting for sync completion"
exit 1
```

### Getting Resource Details

Check the status of individual resources within an application:

```bash
# List all resources in an application
curl -s \
  -H "Authorization: Bearer $ARGOCD_TOKEN" \
  "https://$ARGOCD_SERVER/api/v1/applications/my-app/resource-tree" | \
  jq '.nodes[] | {kind: .kind, name: .name, health: .health.status}'
```

### Refreshing Application State

Force ArgoCD to re-read the Git repository:

```bash
# Hard refresh - clears cache and re-fetches everything
curl -s -X GET \
  -H "Authorization: Bearer $ARGOCD_TOKEN" \
  "https://$ARGOCD_SERVER/api/v1/applications/my-app?refresh=hard"
```

## CI/CD Pipeline Integration Examples

### GitHub Actions Example

```yaml
# .github/workflows/deploy.yml
name: Build and Deploy
on:
  push:
    branches: [main]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Build and push image
        run: |
          docker build -t myregistry.com/myapp:${{ github.sha }} .
          docker push myregistry.com/myapp:${{ github.sha }}

      - name: Update manifests and trigger sync
        env:
          ARGOCD_TOKEN: ${{ secrets.ARGOCD_TOKEN }}
          ARGOCD_SERVER: ${{ secrets.ARGOCD_SERVER }}
        run: |
          # Trigger a hard refresh first
          curl -s -X GET \
            -H "Authorization: Bearer $ARGOCD_TOKEN" \
            "https://$ARGOCD_SERVER/api/v1/applications/my-app?refresh=hard"

          # Trigger sync
          curl -s -X POST \
            -H "Authorization: Bearer $ARGOCD_TOKEN" \
            -H "Content-Type: application/json" \
            "https://$ARGOCD_SERVER/api/v1/applications/my-app/sync" \
            -d '{"prune": true}'

          # Wait for completion
          chmod +x ./scripts/wait-for-sync.sh
          ./scripts/wait-for-sync.sh "$ARGOCD_SERVER" "my-app" 300
```

### Generic CI Script

This script works in any CI system that can run bash:

```bash
#!/bin/bash
# deploy.sh - Generic ArgoCD deployment script for CI/CD
set -e

# Required environment variables
: "${ARGOCD_SERVER:?ARGOCD_SERVER is required}"
: "${ARGOCD_TOKEN:?ARGOCD_TOKEN is required}"
: "${APP_NAME:?APP_NAME is required}"

BASE_URL="https://$ARGOCD_SERVER/api/v1/applications/$APP_NAME"
AUTH_HEADER="Authorization: Bearer $ARGOCD_TOKEN"

echo "==> Refreshing application state"
curl -sf -H "$AUTH_HEADER" "$BASE_URL?refresh=hard" > /dev/null

echo "==> Triggering sync for $APP_NAME"
SYNC_RESPONSE=$(curl -sf -X POST \
  -H "$AUTH_HEADER" \
  -H "Content-Type: application/json" \
  "$BASE_URL/sync" \
  -d '{"prune": true, "strategy": {"apply": {"force": false}}}')

echo "==> Waiting for sync to complete (timeout: 5 minutes)"
for i in $(seq 1 30); do
  RESPONSE=$(curl -sf -H "$AUTH_HEADER" "$BASE_URL")
  SYNC=$(echo "$RESPONSE" | jq -r '.status.sync.status')
  HEALTH=$(echo "$RESPONSE" | jq -r '.status.health.status')
  PHASE=$(echo "$RESPONSE" | jq -r '.status.operationState.phase // "Pending"')

  echo "  [$i/30] Sync=$SYNC Health=$HEALTH Phase=$PHASE"

  if [ "$SYNC" = "Synced" ] && [ "$HEALTH" = "Healthy" ]; then
    echo "==> Deployment successful!"
    exit 0
  fi

  if [ "$PHASE" = "Failed" ] || [ "$PHASE" = "Error" ]; then
    echo "==> Deployment FAILED"
    echo "$RESPONSE" | jq '.status.operationState.message'
    exit 1
  fi

  sleep 10
done

echo "==> Timeout: deployment did not complete within 5 minutes"
exit 1
```

## Handling API Errors

When integrating with CI/CD, robust error handling is important. Here are common API errors and how to handle them:

```bash
# Check HTTP status code before processing the response
HTTP_CODE=$(curl -s -o /tmp/response.json -w "%{http_code}" \
  -H "Authorization: Bearer $ARGOCD_TOKEN" \
  "https://$ARGOCD_SERVER/api/v1/applications/$APP_NAME")

case $HTTP_CODE in
  200) echo "Success" ;;
  401) echo "Authentication failed - check your token"; exit 1 ;;
  403) echo "Permission denied - check RBAC policies"; exit 1 ;;
  404) echo "Application not found: $APP_NAME"; exit 1 ;;
  *)   echo "Unexpected error: HTTP $HTTP_CODE"; cat /tmp/response.json; exit 1 ;;
esac
```

## Security Considerations

When using the ArgoCD API in CI/CD:

1. **Use short-lived tokens** when possible. Rotate long-lived tokens regularly.
2. **Scope permissions narrowly** - use project roles instead of admin tokens.
3. **Always use HTTPS** for API calls. Never disable TLS verification in production.
4. **Store tokens as CI secrets** - never hardcode them in pipeline definitions.
5. **Audit API access** - ArgoCD logs all API calls, so monitor them for unusual activity.

For monitoring your CI/CD pipeline's interactions with ArgoCD, check out [how to configure ArgoCD notifications](https://oneuptime.com/blog/post/2026-01-25-notifications-argocd/view) to stay informed about deployment outcomes.

The ArgoCD API is a powerful tool for CI/CD integration. By using it correctly, you can build robust deployment pipelines that maintain the GitOps model while giving your CI system visibility into the deployment process.
