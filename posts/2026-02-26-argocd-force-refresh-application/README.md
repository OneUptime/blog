# How to Force Refresh Application State in ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Application Management, Troubleshooting

Description: Learn how to force refresh application state in ArgoCD to trigger immediate re-comparison of live cluster state against desired state from Git.

---

ArgoCD continuously monitors your applications, comparing the live state in the cluster against the desired state in Git. But this monitoring happens on a polling interval - by default every 3 minutes. Sometimes you need ArgoCD to refresh its view of the application immediately, whether because you just pushed a change, you suspect stale cache data, or you need to verify the current state right now.

Force refreshing an application tells ArgoCD to re-fetch the desired state from Git and re-compare it against the live state in the cluster, without waiting for the next polling cycle.

## Normal Refresh vs Force Refresh

ArgoCD has two levels of refresh:

**Normal refresh** re-reads the Git repository to get the latest desired state and compares it against the cached live state. It uses the Git cache and the live state cache.

**Hard refresh** (covered in the next topic) goes further by invalidating all caches, including the manifest generation cache. This is more expensive but catches issues that a normal refresh might miss.

A normal force refresh is what you want in most cases. It is fast and sufficient for picking up new Git commits.

## Force Refresh via CLI

The most common way to force a refresh:

```bash
# Force refresh the application state
argocd app get my-app --refresh
```

This command does two things:
1. Triggers an immediate refresh of the application
2. Returns the current application state after the refresh completes

You can also just trigger the refresh without waiting:

```bash
# Trigger refresh and get status in one command
argocd app get my-app --refresh

# Or use the dedicated command
argocd app diff my-app --refresh
```

## Force Refresh via UI

In the ArgoCD web UI:

1. Navigate to your application
2. Click the "Refresh" button in the top toolbar
3. Select "Normal" from the dropdown (not "Hard")
4. The application tile will show a spinning indicator while refreshing
5. Once complete, the sync and health status update

## Force Refresh via API

For programmatic access, use the ArgoCD API:

```bash
# Refresh via API
ARGOCD_SERVER="argocd.example.com"
ARGOCD_TOKEN="your-token"

curl -X GET "https://${ARGOCD_SERVER}/api/v1/applications/my-app?refresh=normal" \
  -H "Authorization: Bearer ${ARGOCD_TOKEN}"
```

The `refresh=normal` query parameter triggers a normal refresh. Use `refresh=hard` for a hard refresh.

## When to Force Refresh

### After Pushing to Git

If you just pushed a commit and do not want to wait for the polling interval:

```bash
# Push your change
git push origin main

# Immediately check if ArgoCD picked it up
argocd app get my-app --refresh
```

If you have webhooks configured, ArgoCD should pick up changes almost immediately. But if webhooks are not set up or have issues, force refresh is your fallback.

### After External Changes to the Cluster

If someone made manual changes to the cluster (kubectl apply, Helm upgrade, etc.), ArgoCD's cached live state might be stale:

```bash
# Someone ran: kubectl scale deployment my-deployment --replicas=5
# Force ArgoCD to see the current state
argocd app get my-app --refresh
```

### Debugging Sync Status

When the sync status does not match what you expect:

```bash
# Application shows Synced but you know it should be OutOfSync
argocd app get my-app --refresh

# Check if the status changed after refresh
argocd app get my-app
```

### After Changing ArgoCD Configuration

If you modified the ArgoCD ConfigMap (resource customizations, ignore differences, etc.):

```bash
# After changing argocd-cm
kubectl apply -f argocd-cm.yaml -n argocd

# Refresh affected applications to pick up new config
argocd app get my-app --refresh
```

## Refreshing Multiple Applications

If you need to refresh many applications at once:

```bash
# Refresh all applications in a project
for app in $(argocd app list -p my-project -o name); do
  argocd app get "$app" --refresh &
done
wait

# Or refresh all applications
argocd app list -o name | xargs -P 5 -I {} argocd app get {} --refresh
```

The `-P 5` flag runs up to 5 refreshes in parallel.

## Configuring the Polling Interval

If you find yourself force-refreshing frequently, consider adjusting the default polling interval:

```yaml
# argocd-cm ConfigMap
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cm
  namespace: argocd
data:
  # Default is 180 (3 minutes), reduce to 60 (1 minute)
  timeout.reconciliation: "60"
```

A shorter interval means ArgoCD picks up changes faster, but increases load on the Git server and the ArgoCD repo server.

## Webhook-Based Refresh

Instead of frequent polling or manual refreshes, configure webhooks from your Git provider to notify ArgoCD of changes immediately:

```yaml
# GitHub webhook configuration
# In your GitHub repo settings, add a webhook:
# URL: https://argocd.example.com/api/webhook
# Content type: application/json
# Secret: your-webhook-secret
# Events: Push events

# Configure the webhook secret in ArgoCD
apiVersion: v1
kind: Secret
metadata:
  name: argocd-secret
  namespace: argocd
stringData:
  webhook.github.secret: your-webhook-secret
```

With webhooks, ArgoCD refreshes the application within seconds of a Git push, eliminating the need for manual force refreshes in most cases.

## Refresh vs Sync

It is important to understand the difference:

- **Refresh** updates ArgoCD's knowledge of the current state. It does not change anything in the cluster.
- **Sync** applies the desired state from Git to the cluster. It changes resources.

You can refresh without syncing. This is useful when you want to check the current drift without deploying anything:

```bash
# Just refresh and see the diff, do not sync
argocd app get my-app --refresh
argocd app diff my-app
```

## Troubleshooting Refresh Issues

If force refresh does not seem to pick up your changes:

```bash
# Check if the repo server is healthy
kubectl get pods -n argocd -l app.kubernetes.io/name=argocd-repo-server

# Check repo server logs for errors
kubectl logs -n argocd -l app.kubernetes.io/name=argocd-repo-server --tail=50

# Verify the Git repo is accessible
argocd repo list

# Check the application's repo connection
argocd app get my-app -o yaml | grep -A 5 source
```

If the repo server is healthy but changes are not appearing, the issue might be with the manifest generation cache. In that case, try a hard refresh instead (covered in our guide on [how to hard refresh application in ArgoCD](https://oneuptime.com/blog/post/2026-02-26-argocd-hard-refresh-application/view)).

## Impact on ArgoCD Performance

Force refreshing is lightweight compared to hard refresh. It re-reads from Git (which may be cached by the repo server) and re-compares states. For individual applications, the impact is negligible.

However, force-refreshing hundreds of applications simultaneously can spike the load on the repo server. If you need to bulk refresh, stagger the requests:

```bash
# Staggered refresh with 1-second delay between apps
for app in $(argocd app list -o name); do
  argocd app get "$app" --refresh
  sleep 1
done
```

## Summary

Force refreshing in ArgoCD is a simple but essential operation for keeping your application state view current. Use it after Git pushes when webhooks are not configured, after manual cluster changes, or when debugging sync status discrepancies. For most cases, a normal refresh is sufficient. Reserve hard refresh for situations where cache invalidation is needed.
