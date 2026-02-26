# How to Sync Applications via ArgoCD API

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, REST API, Sync

Description: Learn how to trigger, monitor, and manage ArgoCD application sync operations through the REST API for CI/CD automation and custom tooling.

---

Syncing applications is the core action in ArgoCD - it reconciles your live Kubernetes state with the desired state defined in Git. While the UI and CLI make syncing easy for humans, the REST API enables you to trigger syncs from CI/CD pipelines, custom scripts, and external systems. Understanding the sync API gives you full control over when and how deployments happen.

## The Sync Endpoint

The endpoint for triggering a sync is:

```
POST /api/v1/applications/{name}/sync
```

It accepts a JSON body with sync options and returns the sync operation result.

## Basic Sync

The simplest sync triggers a reconciliation with default options:

```bash
# Trigger a basic sync
curl -s -k -H "Authorization: Bearer $ARGOCD_TOKEN" \
  -X POST "https://argocd.example.com/api/v1/applications/my-app/sync" \
  -H "Content-Type: application/json" \
  -d '{}'
```

This is equivalent to clicking "Sync" in the ArgoCD UI with no additional options selected.

## Sync with Prune

To remove resources that no longer exist in Git:

```bash
# Sync with pruning enabled
curl -s -k -H "Authorization: Bearer $ARGOCD_TOKEN" \
  -X POST "https://argocd.example.com/api/v1/applications/my-app/sync" \
  -H "Content-Type: application/json" \
  -d '{
    "prune": true
  }'
```

## Sync to a Specific Revision

Deploy a specific Git commit, tag, or branch:

```bash
# Sync to a specific commit SHA
curl -s -k -H "Authorization: Bearer $ARGOCD_TOKEN" \
  -X POST "https://argocd.example.com/api/v1/applications/my-app/sync" \
  -H "Content-Type: application/json" \
  -d '{
    "revision": "abc123def456",
    "prune": true
  }'

# Sync to a specific tag
curl -s -k -H "Authorization: Bearer $ARGOCD_TOKEN" \
  -X POST "https://argocd.example.com/api/v1/applications/my-app/sync" \
  -H "Content-Type: application/json" \
  -d '{
    "revision": "v2.3.1",
    "prune": true
  }'
```

## Sync with Strategy Options

ArgoCD supports two sync strategies - Apply and Hook:

```bash
# Sync using apply strategy (default kubectl apply)
curl -s -k -H "Authorization: Bearer $ARGOCD_TOKEN" \
  -X POST "https://argocd.example.com/api/v1/applications/my-app/sync" \
  -H "Content-Type: application/json" \
  -d '{
    "prune": true,
    "strategy": {
      "apply": {
        "force": false
      }
    }
  }'

# Sync using hook strategy (respects sync hooks)
curl -s -k -H "Authorization: Bearer $ARGOCD_TOKEN" \
  -X POST "https://argocd.example.com/api/v1/applications/my-app/sync" \
  -H "Content-Type: application/json" \
  -d '{
    "prune": true,
    "strategy": {
      "hook": {}
    }
  }'

# Force sync (deletes and recreates resources instead of patching)
curl -s -k -H "Authorization: Bearer $ARGOCD_TOKEN" \
  -X POST "https://argocd.example.com/api/v1/applications/my-app/sync" \
  -H "Content-Type: application/json" \
  -d '{
    "prune": true,
    "strategy": {
      "apply": {
        "force": true
      }
    }
  }'
```

## Selective Sync: Specific Resources Only

Sync only specific resources instead of the entire application:

```bash
# Sync only a specific deployment
curl -s -k -H "Authorization: Bearer $ARGOCD_TOKEN" \
  -X POST "https://argocd.example.com/api/v1/applications/my-app/sync" \
  -H "Content-Type: application/json" \
  -d '{
    "resources": [
      {
        "group": "apps",
        "kind": "Deployment",
        "name": "api-server",
        "namespace": "production"
      }
    ]
  }'

# Sync multiple specific resources
curl -s -k -H "Authorization: Bearer $ARGOCD_TOKEN" \
  -X POST "https://argocd.example.com/api/v1/applications/my-app/sync" \
  -H "Content-Type: application/json" \
  -d '{
    "resources": [
      {
        "group": "apps",
        "kind": "Deployment",
        "name": "api-server",
        "namespace": "production"
      },
      {
        "group": "",
        "kind": "ConfigMap",
        "name": "api-config",
        "namespace": "production"
      },
      {
        "group": "",
        "kind": "Service",
        "name": "api-server",
        "namespace": "production"
      }
    ]
  }'
```

## Sync with Dry Run

Preview what a sync would do without actually applying changes:

```bash
# Dry run sync
curl -s -k -H "Authorization: Bearer $ARGOCD_TOKEN" \
  -X POST "https://argocd.example.com/api/v1/applications/my-app/sync" \
  -H "Content-Type: application/json" \
  -d '{
    "dryRun": true,
    "prune": true
  }'
```

## Monitoring Sync Status

After triggering a sync, you need to monitor its progress:

```bash
# Check current sync operation status
curl -s -k -H "Authorization: Bearer $ARGOCD_TOKEN" \
  "https://argocd.example.com/api/v1/applications/my-app" | \
  jq '{
    syncStatus: .status.sync.status,
    healthStatus: .status.health.status,
    operationPhase: .status.operationState.phase,
    message: .status.operationState.message,
    startedAt: .status.operationState.startedAt,
    finishedAt: .status.operationState.finishedAt
  }'
```

### Wait for Sync Completion Script

```bash
#!/bin/bash
# wait-for-sync.sh - Wait for an ArgoCD sync to complete
# Usage: ./wait-for-sync.sh <app-name> [timeout-seconds]

APP_NAME="$1"
TIMEOUT="${2:-300}"
ARGOCD_SERVER="https://argocd.example.com"

echo "Waiting for $APP_NAME sync to complete (timeout: ${TIMEOUT}s)..."

START=$(date +%s)
while true; do
  ELAPSED=$(( $(date +%s) - START ))
  if [ $ELAPSED -gt $TIMEOUT ]; then
    echo "TIMEOUT: Sync did not complete within ${TIMEOUT}s"
    exit 1
  fi

  # Get the current operation state
  STATE=$(curl -s -k -H "Authorization: Bearer $ARGOCD_TOKEN" \
    "$ARGOCD_SERVER/api/v1/applications/$APP_NAME" | \
    jq -r '{
      phase: (.status.operationState.phase // "Unknown"),
      sync: .status.sync.status,
      health: .status.health.status
    }')

  PHASE=$(echo "$STATE" | jq -r '.phase')
  SYNC=$(echo "$STATE" | jq -r '.sync')
  HEALTH=$(echo "$STATE" | jq -r '.health')

  echo "[${ELAPSED}s] Phase: $PHASE | Sync: $SYNC | Health: $HEALTH"

  # Check for completion
  case "$PHASE" in
    "Succeeded")
      if [ "$HEALTH" = "Healthy" ]; then
        echo "Sync completed successfully!"
        exit 0
      fi
      ;;
    "Failed"|"Error")
      echo "Sync failed!"
      # Get error details
      curl -s -k -H "Authorization: Bearer $ARGOCD_TOKEN" \
        "$ARGOCD_SERVER/api/v1/applications/$APP_NAME" | \
        jq '.status.operationState.syncResult.resources[] | select(.status != "Synced")'
      exit 1
      ;;
  esac

  sleep 5
done
```

## CI/CD Pipeline Integration

### GitHub Actions Example

```yaml
# .github/workflows/deploy.yml
name: Deploy via ArgoCD
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger ArgoCD Sync
        env:
          ARGOCD_TOKEN: ${{ secrets.ARGOCD_TOKEN }}
          ARGOCD_SERVER: ${{ secrets.ARGOCD_SERVER }}
        run: |
          # Trigger sync with the current commit
          curl -sf -k \
            -H "Authorization: Bearer $ARGOCD_TOKEN" \
            -X POST "$ARGOCD_SERVER/api/v1/applications/my-app/sync" \
            -H "Content-Type: application/json" \
            -d "{\"revision\": \"$GITHUB_SHA\", \"prune\": true}"

      - name: Wait for Sync
        env:
          ARGOCD_TOKEN: ${{ secrets.ARGOCD_TOKEN }}
          ARGOCD_SERVER: ${{ secrets.ARGOCD_SERVER }}
        run: |
          for i in $(seq 1 60); do
            STATUS=$(curl -sf -k \
              -H "Authorization: Bearer $ARGOCD_TOKEN" \
              "$ARGOCD_SERVER/api/v1/applications/my-app" | \
              jq -r '.status.operationState.phase')

            echo "Attempt $i: Phase = $STATUS"

            if [ "$STATUS" = "Succeeded" ]; then
              echo "Deployment successful!"
              exit 0
            elif [ "$STATUS" = "Failed" ] || [ "$STATUS" = "Error" ]; then
              echo "Deployment failed!"
              exit 1
            fi

            sleep 10
          done
          echo "Deployment timed out"
          exit 1
```

## Bulk Sync Operations

Sync multiple applications at once:

```bash
#!/bin/bash
# bulk-sync.sh - Sync all applications in a project

ARGOCD_SERVER="https://argocd.example.com"
PROJECT="production"

# Get all application names in the project
APP_NAMES=$(curl -s -k -H "Authorization: Bearer $ARGOCD_TOKEN" \
  "$ARGOCD_SERVER/api/v1/applications?project=$PROJECT" | \
  jq -r '.items[].metadata.name')

# Sync each application
for APP in $APP_NAMES; do
  echo "Syncing $APP..."
  curl -s -k -H "Authorization: Bearer $ARGOCD_TOKEN" \
    -X POST "$ARGOCD_SERVER/api/v1/applications/$APP/sync" \
    -H "Content-Type: application/json" \
    -d '{"prune": true}' > /dev/null

  echo "  Sync triggered"
done

echo "All syncs triggered. Monitor progress in ArgoCD UI."
```

## Terminating a Running Sync

If a sync is stuck or needs to be cancelled:

```bash
# Terminate a running sync operation
curl -s -k -H "Authorization: Bearer $ARGOCD_TOKEN" \
  -X DELETE "https://argocd.example.com/api/v1/applications/my-app/operation"
```

The sync API is the most important endpoint for ArgoCD automation. By combining sync triggers with status monitoring, you can build robust deployment pipelines that integrate seamlessly with your existing CI/CD infrastructure. Whether you are deploying a single service or orchestrating a fleet of microservices, the sync API gives you precise control over the deployment process.
