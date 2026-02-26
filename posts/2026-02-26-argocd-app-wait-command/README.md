# How to Use argocd app wait for CI/CD Integration

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, CLI, CI/CD

Description: Learn how to use argocd app wait to block CI/CD pipelines until applications are synced and healthy, with timeout handling and failure detection patterns.

---

CI/CD pipelines need to know when a deployment is actually done - not just when the sync was initiated, but when the application is running and healthy. The `argocd app wait` command blocks until an application reaches the desired state, making it the essential glue between ArgoCD and your CI/CD pipeline.

## Basic Usage

```bash
# Wait for the application to be synced and healthy
argocd app wait my-app
```

By default, this waits for both sync completion AND healthy status. It blocks until both conditions are met or a timeout occurs.

## Wait Conditions

You can wait for specific conditions independently:

### Wait for Sync Only

```bash
# Wait until sync operation completes (regardless of health)
argocd app wait my-app --sync
```

This is useful when you want to confirm the sync succeeded but do not need to wait for all pods to be ready.

### Wait for Health Only

```bash
# Wait until the application reports healthy
argocd app wait my-app --health
```

This is useful after a rollback or when you have made changes that do not involve a sync.

### Wait for Specific Operation

```bash
# Wait for the current operation to complete
argocd app wait my-app --operation
```

This waits for whatever operation is currently running (sync, rollback, etc.) to finish.

### Wait for Suspended State

```bash
# Wait until the application is suspended (paused rollout)
argocd app wait my-app --suspended
```

Useful with Argo Rollouts when you want to wait for a canary rollout to reach a pause point.

## Timeout Configuration

Always set a timeout in CI/CD pipelines:

```bash
# Wait with a 5-minute timeout
argocd app wait my-app --timeout 300

# Wait with a 10-minute timeout
argocd app wait my-app --timeout 600
```

If the timeout is reached before the conditions are met, the command exits with a non-zero exit code. The default timeout is 0 (wait forever), which is dangerous in CI/CD.

## Exit Codes

Understanding exit codes is critical for pipeline logic:

- **Exit code 0**: All conditions met within the timeout
- **Non-zero exit code**: Timeout reached or error occurred

```bash
argocd app wait my-app --timeout 300
EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ]; then
  echo "Deployment successful!"
else
  echo "Deployment failed or timed out"
  exit 1
fi
```

## Complete CI/CD Pipeline Pattern

Here is the standard pattern for using `argocd app wait` in a CI/CD pipeline:

```bash
#!/bin/bash
# ci-deploy.sh - Complete CI/CD deployment with ArgoCD

set -e

APP_NAME="${1:?Usage: ci-deploy.sh <app-name> <image-tag>}"
IMAGE_TAG="${2:?Usage: ci-deploy.sh <app-name> <image-tag>}"
TIMEOUT=300

echo "=== Deploying $APP_NAME with image $IMAGE_TAG ==="

# Step 1: Update the image tag
echo "Updating application..."
argocd app set "$APP_NAME" --helm-set image.tag="$IMAGE_TAG"

# Step 2: Trigger sync
echo "Triggering sync..."
argocd app sync "$APP_NAME" --async

# Step 3: Wait for sync to complete
echo "Waiting for sync..."
if ! argocd app wait "$APP_NAME" --sync --timeout "$TIMEOUT"; then
  echo "SYNC FAILED: Sync did not complete within ${TIMEOUT}s"
  argocd app get "$APP_NAME"
  exit 1
fi

# Step 4: Wait for health
echo "Waiting for healthy state..."
if ! argocd app wait "$APP_NAME" --health --timeout "$TIMEOUT"; then
  echo "HEALTH CHECK FAILED: Application not healthy within ${TIMEOUT}s"
  argocd app get "$APP_NAME"

  # Show unhealthy resources for debugging
  argocd app get "$APP_NAME" -o json | jq '.status.resources[] | select(.health.status != "Healthy")'
  exit 1
fi

echo "=== Deployment successful! ==="
argocd app get "$APP_NAME"
```

## GitHub Actions Integration

```yaml
name: Deploy to Production
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install ArgoCD CLI
        run: |
          curl -sSL -o argocd https://github.com/argoproj/argo-cd/releases/latest/download/argocd-linux-amd64
          chmod +x argocd
          sudo mv argocd /usr/local/bin/

      - name: Login to ArgoCD
        run: argocd login ${{ secrets.ARGOCD_SERVER }} --username ${{ secrets.ARGOCD_USER }} --password ${{ secrets.ARGOCD_PASS }} --grpc-web

      - name: Update Image Tag
        run: argocd app set my-app --helm-set image.tag=${{ github.sha }}

      - name: Sync Application
        run: argocd app sync my-app --async

      - name: Wait for Sync
        run: argocd app wait my-app --sync --timeout 300

      - name: Wait for Health
        run: argocd app wait my-app --health --timeout 300

      - name: Verify Deployment
        if: success()
        run: argocd app get my-app

      - name: Rollback on Failure
        if: failure()
        run: |
          echo "Deployment failed, initiating rollback..."
          argocd app set my-app --sync-policy none
          argocd app rollback my-app
          argocd app wait my-app --health --timeout 300
```

## GitLab CI Integration

```yaml
deploy_production:
  stage: deploy
  image: argoproj/argocd:latest
  script:
    - argocd login $ARGOCD_SERVER --username $ARGOCD_USER --password $ARGOCD_PASS --grpc-web
    - argocd app set my-app --helm-set image.tag=$CI_COMMIT_SHA
    - argocd app sync my-app --async
    - argocd app wait my-app --sync --health --timeout 600
  only:
    - main
```

## Waiting for Multiple Applications

When deploying multiple applications that depend on each other:

```bash
#!/bin/bash
# deploy-stack.sh - Deploy a stack of applications in order

TIMEOUT=300

# Deploy infrastructure first
echo "Deploying infrastructure..."
argocd app sync infrastructure --async
argocd app wait infrastructure --sync --health --timeout "$TIMEOUT"

# Deploy databases
echo "Deploying databases..."
argocd app sync database --async
argocd app wait database --sync --health --timeout "$TIMEOUT"

# Deploy application services
echo "Deploying services..."
argocd app sync api-service --async
argocd app sync web-frontend --async

# Wait for all services in parallel (check separately)
argocd app wait api-service --sync --health --timeout "$TIMEOUT" &
PID_API=$!
argocd app wait web-frontend --sync --health --timeout "$TIMEOUT" &
PID_WEB=$!

# Wait for both to complete
wait $PID_API
API_EXIT=$?
wait $PID_WEB
WEB_EXIT=$?

if [ $API_EXIT -ne 0 ] || [ $WEB_EXIT -ne 0 ]; then
  echo "One or more services failed to deploy"
  exit 1
fi

echo "All services deployed successfully!"
```

## Advanced Wait with Polling

For situations where the built-in wait is not flexible enough, build a custom polling loop:

```bash
#!/bin/bash
# custom-wait.sh - Custom wait with detailed progress reporting

APP_NAME="${1:?Usage: custom-wait.sh <app-name>}"
TIMEOUT="${2:-300}"

START_TIME=$(date +%s)
END_TIME=$((START_TIME + TIMEOUT))

echo "Waiting for $APP_NAME (timeout: ${TIMEOUT}s)"

while [ $(date +%s) -lt $END_TIME ]; do
  DATA=$(argocd app get "$APP_NAME" -o json 2>/dev/null)

  SYNC=$(echo "$DATA" | jq -r '.status.sync.status')
  HEALTH=$(echo "$DATA" | jq -r '.status.health.status')
  OP_PHASE=$(echo "$DATA" | jq -r '.status.operationState.phase // "N/A"')

  ELAPSED=$(( $(date +%s) - START_TIME ))
  echo "[${ELAPSED}s] Sync: $SYNC | Health: $HEALTH | Operation: $OP_PHASE"

  # Success condition
  if [ "$SYNC" = "Synced" ] && [ "$HEALTH" = "Healthy" ]; then
    echo "Application is synced and healthy!"
    exit 0
  fi

  # Failure conditions
  if [ "$OP_PHASE" = "Failed" ] || [ "$OP_PHASE" = "Error" ]; then
    echo "Operation failed!"
    OP_MSG=$(echo "$DATA" | jq -r '.status.operationState.message // "unknown"')
    echo "Message: $OP_MSG"
    exit 1
  fi

  if [ "$HEALTH" = "Degraded" ] && [ "$SYNC" = "Synced" ]; then
    echo "Application is synced but degraded!"
    echo "$DATA" | jq '.status.resources[] | select(.health.status == "Degraded")'
    exit 1
  fi

  sleep 10
done

echo "TIMEOUT: Application did not reach desired state within ${TIMEOUT}s"
exit 1
```

## Timeout Considerations

Choosing the right timeout depends on your application:

| Application Type | Suggested Timeout | Reason |
|---|---|---|
| Small stateless service | 120s | Fast container startup |
| Standard web application | 300s | Image pull + startup time |
| Large application with migrations | 600s | Database migration time |
| Cluster bootstrapping | 900s | Multiple dependent resources |
| Applications with slow health checks | 600s | Custom health check delays |

## Handling Flaky Wait Scenarios

Sometimes applications briefly report unhealthy during deployment. Handle this with retries:

```bash
#!/bin/bash
# resilient-wait.sh - Wait with retry for transient issues

APP_NAME="${1:?Usage: resilient-wait.sh <app-name>}"
MAX_RETRIES=3
TIMEOUT=300

for i in $(seq 1 $MAX_RETRIES); do
  echo "Attempt $i of $MAX_RETRIES..."

  if argocd app wait "$APP_NAME" --sync --health --timeout "$TIMEOUT"; then
    echo "Application is ready!"
    exit 0
  fi

  echo "Wait failed on attempt $i"

  if [ $i -lt $MAX_RETRIES ]; then
    echo "Retrying in 30 seconds..."
    sleep 30
    argocd app get "$APP_NAME" --hard-refresh > /dev/null
  fi
done

echo "All retry attempts exhausted"
exit 1
```

## Summary

The `argocd app wait` command is the bridge between ArgoCD operations and CI/CD pipeline logic. Always use it with a timeout in automated environments, combine `--sync` and `--health` flags for complete deployment verification, and build failure handling around the exit codes. For complex deployments, combine multiple wait calls with ordering logic to deploy application stacks in the correct sequence.
