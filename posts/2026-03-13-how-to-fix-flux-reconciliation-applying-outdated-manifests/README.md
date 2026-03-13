# How to Fix Flux Reconciliation Applying Outdated Manifests

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, Troubleshooting, Reconciliation, Source, Cache

Description: Fix situations where Flux applies stale or outdated manifests instead of the latest changes from your Git repository, including source caching and artifact issues.

---

You have pushed new changes to your Git repository, but Flux keeps applying the old version of your manifests. The cluster is out of sync with your Git state, and no amount of waiting seems to help. This post covers why Flux might be stuck on outdated manifests and how to force it to pick up the latest changes.

## Symptoms

Your Git repository has new commits, but Flux shows an old revision:

```bash
flux get sources git
```

```
NAME        REVISION              SUSPENDED   READY   MESSAGE
my-repo     main@sha1:old123      False       True    stored artifact for revision 'main@sha1:old123'
```

The latest commit in your repository is `new456`, but Flux is still using `old123`.

## Diagnostic Commands

### Compare Git revision with Flux revision

```bash
# Check what Flux has
flux get sources git my-repo

# Check what Git has
git ls-remote https://github.com/org/repo refs/heads/main
```

### Check the source controller logs

```bash
kubectl logs -n flux-system deployment/source-controller --since=30m | grep my-repo
```

### Verify the artifact storage

```bash
kubectl get gitrepository my-repo -n flux-system -o jsonpath='{.status.artifact}'
```

### Check if the source is being fetched

```bash
kubectl events --for gitrepository/my-repo -n flux-system
```

## Common Root Causes

### 1. Source controller not fetching new commits

The source controller may have failed to contact the Git server due to authentication issues, network problems, or rate limiting.

### 2. Stale artifact in source controller cache

The source controller caches artifacts locally. If the cache becomes corrupted or the storage volume is full, new artifacts cannot be stored.

### 3. Branch or tag reference not updating

If the GitRepository points to a tag instead of a branch, it will not pick up new commits automatically.

### 4. Webhook delivery failures

If you rely on receiver webhooks to trigger reconciliation instead of polling, missed webhooks mean Flux does not know about new commits.

### 5. Suspended source or kustomization

A suspended resource will not fetch or apply new changes.

## Step-by-Step Fixes

### Fix 1: Force source reconciliation

Trigger an immediate fetch of the source:

```bash
flux reconcile source git my-repo
```

Then reconcile the kustomization:

```bash
flux reconcile kustomization my-app --with-source
```

### Fix 2: Check and fix authentication

Verify the Git credentials are still valid:

```bash
kubectl get secret my-repo-auth -n flux-system -o jsonpath='{.data}' | base64 -d
```

If credentials have expired, update them:

```bash
flux create secret git my-repo-auth \
  --url=ssh://git@github.com/org/repo \
  --private-key-file=./deploy-key
```

For HTTPS:

```bash
flux create secret git my-repo-auth \
  --url=https://github.com/org/repo \
  --username=git \
  --password=$GITHUB_TOKEN
```

### Fix 3: Check source controller storage

Verify the source controller has available storage:

```bash
kubectl exec -n flux-system deployment/source-controller -- df -h /data
```

If storage is full, increase the PVC or clean up old artifacts:

```bash
kubectl delete gitrepository my-repo -n flux-system
# Re-create it to force a fresh fetch
flux reconcile source git my-repo
```

### Fix 4: Verify the Git reference

Ensure the GitRepository is pointing to the correct branch:

```bash
kubectl get gitrepository my-repo -n flux-system -o jsonpath='{.spec.ref}'
```

If it points to a specific commit or tag, update it:

```yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: my-repo
  namespace: flux-system
spec:
  ref:
    branch: main  # Use branch, not a fixed tag or commit
  interval: 1m
```

### Fix 5: Resume suspended resources

Check if the source or kustomization is suspended:

```bash
flux get sources git my-repo
flux get kustomization my-app
```

Resume if needed:

```bash
flux resume source git my-repo
flux resume kustomization my-app
```

### Fix 6: Restart the source controller

As a last resort, restart the source controller to clear in-memory caches:

```bash
kubectl rollout restart deployment/source-controller -n flux-system
```

## Prevention Strategies

1. **Monitor source revision age** by comparing the artifact revision timestamp against the current time. Alert when the gap exceeds your reconciliation interval.
2. **Use short polling intervals** for critical repositories:

```yaml
spec:
  interval: 1m  # Poll every minute for production
```

3. **Set up GitHub/GitLab webhooks** with Flux receivers for near-instant reconciliation:

```yaml
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Receiver
metadata:
  name: github-receiver
  namespace: flux-system
spec:
  type: github
  events:
    - "ping"
    - "push"
  secretRef:
    name: receiver-token
  resources:
    - kind: GitRepository
      name: my-repo
```

4. **Rotate credentials proactively** before they expire, and automate credential rotation where possible.
5. **Monitor source controller storage** and set up alerts before the volume fills up.

Stale manifests are a serious GitOps concern because the cluster silently diverges from your declared state. Monitoring source freshness is just as important as monitoring reconciliation health.
