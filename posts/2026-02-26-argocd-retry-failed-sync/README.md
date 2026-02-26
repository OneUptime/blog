# How to Retry a Failed Sync in ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Sync Operations, Troubleshooting

Description: Learn how to retry failed sync operations in ArgoCD using the UI, CLI, and declarative configuration to recover from transient deployment failures.

---

Sync operations in ArgoCD can fail for many reasons - network timeouts, resource quota limits, image pull errors, or transient API server issues. When a sync fails, you need to understand what happened and decide whether to retry manually or let ArgoCD handle retries automatically.

This guide covers both manual retry approaches and the thought process behind deciding when to retry versus when to investigate the root cause first.

## Understanding Sync Failure States

When an ArgoCD sync fails, the application enters a specific state. The sync status shows "Failed" and the operation result contains error details. You can see this in both the UI and CLI:

```bash
# Check the status of a failed sync
argocd app get my-app

# Output shows something like:
# Name:               my-app
# Sync Status:        OutOfSync
# Health Status:      Degraded
# Last Sync Result:   Failed
# Message:            one or more objects failed to apply
```

The key information is in the sync operation details:

```bash
# View detailed sync operation results
argocd app get my-app --show-operation
```

This shows you exactly which resources failed and why.

## Manual Retry via CLI

The simplest way to retry a failed sync is to run the sync command again:

```bash
# Basic retry - sync the application again
argocd app sync my-app
```

If you want to retry with the same options as the previous sync:

```bash
# Retry with specific revision
argocd app sync my-app --revision HEAD

# Retry specific resources that failed
argocd app sync my-app --resource apps:Deployment:my-deployment

# Retry with a longer timeout
argocd app sync my-app --timeout 300
```

## Manual Retry via UI

In the ArgoCD web UI:

1. Navigate to your application
2. You will see the "Failed" status banner with error details
3. Click the "Sync" button in the top bar
4. Review the sync parameters
5. Click "Synchronize" to retry

The UI preserves your previous sync options, making it easy to retry with the same configuration.

## Force Sync After Failure

Sometimes a regular retry is not enough. If the failure was caused by a stale cache or comparison, you can force a refresh before syncing:

```bash
# Refresh the application state, then sync
argocd app get my-app --refresh
argocd app sync my-app

# Or combine into one step by forcing the sync
argocd app sync my-app --force
```

The `--force` flag tells ArgoCD to delete and recreate resources that cannot be updated in place. Use this carefully - it causes brief downtime for the affected resources.

## Retrying Specific Resources

When only certain resources failed during a sync, you do not need to re-sync everything. Target just the failed resources:

```bash
# Retry only the failed Deployment
argocd app sync my-app --resource apps:Deployment:web-server

# Retry multiple specific resources
argocd app sync my-app \
  --resource apps:Deployment:web-server \
  --resource :Service:web-server-svc \
  --resource :ConfigMap:web-config
```

The resource format is `group:kind:name`. For core API group resources (like Services, ConfigMaps), the group is empty.

## Common Failure Scenarios and Retry Strategies

### Image Pull Errors

If the sync failed because a container image could not be pulled:

```bash
# Check the specific error
kubectl describe pod -n my-namespace -l app=my-app | grep -A 3 "Events"

# If the image was just pushed and the registry had a delay, a simple retry works
argocd app sync my-app
```

But if the image tag does not exist, retrying will not help. Fix the image reference in Git first.

### Resource Quota Exceeded

```bash
# Check resource quotas
kubectl describe resourcequota -n my-namespace

# If quota was temporarily exceeded, retry after freeing resources
# First, check if old resources can be pruned
argocd app sync my-app --prune
```

### API Server Timeout

Transient API server issues are the ideal case for retries. They usually succeed on the second attempt:

```bash
# Simple retry is usually sufficient
argocd app sync my-app

# If the cluster is under heavy load, add a longer timeout
argocd app sync my-app --timeout 600
```

### Webhook Rejection

If an admission webhook rejected a resource:

```bash
# Check the error message
argocd app get my-app --show-operation

# If it is a policy violation, fix the manifest in Git first
# If it is a transient webhook error, retry
argocd app sync my-app
```

## Partial Sync Retry

After a sync failure, some resources might have been applied successfully while others failed. You can check which resources are in sync and which are not:

```bash
# List all resources and their sync status
argocd app resources my-app

# Look for resources still OutOfSync
argocd app resources my-app | grep OutOfSync
```

Then retry only the out-of-sync resources using `--resource` flags.

## Retry with Modified Options

Sometimes a sync fails because of the sync options used. You can retry with different options:

```bash
# Original sync failed with validation error
# Retry with validation disabled
argocd app sync my-app --sync-option Validate=false

# Original sync failed with large CRD
# Retry with server-side apply
argocd app sync my-app --sync-option ServerSideApply=true

# Original sync timed out
# Retry with replace instead of apply
argocd app sync my-app --sync-option Replace=true
```

## Using the API for Programmatic Retries

If you are building automation around ArgoCD, you can use the API to trigger retries:

```bash
# Using the ArgoCD API via curl
ARGOCD_TOKEN="your-auth-token"
ARGOCD_SERVER="argocd.example.com"

# Trigger a sync via API
curl -X POST "https://${ARGOCD_SERVER}/api/v1/applications/my-app/sync" \
  -H "Authorization: Bearer ${ARGOCD_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "revision": "HEAD",
    "dryRun": false,
    "strategy": {
      "apply": {
        "force": false
      }
    }
  }'
```

## CI/CD Pipeline Retry Logic

In CI/CD pipelines, you often want to retry syncs with a backoff strategy:

```bash
#!/bin/bash
# retry-sync.sh - Retry ArgoCD sync with exponential backoff

APP_NAME=$1
MAX_RETRIES=3
RETRY_DELAY=10

for i in $(seq 1 $MAX_RETRIES); do
  echo "Attempt $i of $MAX_RETRIES: syncing $APP_NAME"

  # Trigger sync and wait for it to complete
  if argocd app sync "$APP_NAME" --timeout 300; then
    echo "Sync succeeded on attempt $i"

    # Wait for health check
    if argocd app wait "$APP_NAME" --timeout 300 --health; then
      echo "Application is healthy"
      exit 0
    fi
  fi

  echo "Attempt $i failed"

  if [ $i -lt $MAX_RETRIES ]; then
    SLEEP_TIME=$((RETRY_DELAY * i))
    echo "Waiting ${SLEEP_TIME}s before retry..."
    sleep $SLEEP_TIME
  fi
done

echo "All $MAX_RETRIES attempts failed"
exit 1
```

## Pre-Retry Checklist

Before blindly retrying a failed sync, run through this checklist:

1. **Read the error message.** It usually tells you exactly what went wrong.
2. **Check if the issue is transient.** Network errors and API timeouts are good retry candidates.
3. **Check if the manifest is correct.** Validation errors and missing fields require Git fixes, not retries.
4. **Check cluster resources.** Resource quota, PV availability, and node capacity issues need cluster-level fixes.
5. **Check external dependencies.** Image registries, secret stores, and external services might be down.

## Automatic vs Manual Retries

For transient failures, configuring automatic retries (covered in the next topic) is usually better than manual retries. Manual retries are appropriate when:

- You need to investigate the failure first
- You want to retry with different sync options
- The failure requires a Git change before retrying
- You want to retry only specific resources

For more on configuring automatic retry policies, see our guide on [how to configure automatic sync retries in ArgoCD](https://oneuptime.com/blog/post/2026-02-26-argocd-automatic-sync-retries/view).

## Summary

Retrying failed syncs in ArgoCD is straightforward - run `argocd app sync` again or click the sync button in the UI. But the key to effective retry strategies is understanding why the sync failed in the first place. Transient errors benefit from immediate retries, while configuration errors require fixes in Git. Use targeted resource syncs when only specific resources failed, and consider automatic retry policies for production applications where transient failures are expected.
