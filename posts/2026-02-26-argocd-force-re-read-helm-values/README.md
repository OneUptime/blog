# How to Force ArgoCD to Re-Read Helm Values from Git

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Helm, Troubleshooting

Description: Learn why ArgoCD sometimes does not pick up Helm values changes from Git and how to force it to re-read and apply updated values.

---

You pushed updated Helm values to your Git repo, but ArgoCD still shows the application as "Synced" with the old values. This is a frustrating situation that catches many teams off guard. ArgoCD should be watching your Git repo and detecting changes, so why does it sometimes miss Helm values updates?

The answer usually comes down to caching, manifest generation behavior, or configuration issues. Let me walk through the common causes and solutions.

## Why ArgoCD Misses Helm Values Changes

ArgoCD uses its repo-server component to clone Git repositories and generate Kubernetes manifests. For Helm applications, this means running `helm template` against your chart with the specified values files. Several things can prevent the updated values from being picked up.

**Repo-server cache**: The repo-server caches manifests to avoid regenerating them on every refresh cycle. If the cache has not expired and ArgoCD does not detect the Git change, it serves stale manifests.

**Git webhook not configured**: Without a webhook, ArgoCD polls Git on an interval (default 3 minutes). Your changes may just not have been detected yet.

**Wrong values file path**: If the path to your values file in the Application spec does not match the actual file path in the repo, ArgoCD will use default values.

**Branch reference issues**: If your Application points to a branch but ArgoCD has cached the old commit SHA, it may not see the new commit.

## Method 1: Hard Refresh from the UI or CLI

The quickest way to force ArgoCD to re-read everything from Git is a hard refresh.

```bash
# Hard refresh forces ArgoCD to invalidate cache and re-clone the repo
argocd app get my-app --hard-refresh

# Or trigger a hard refresh and sync in one step
argocd app sync my-app --force
```

In the ArgoCD UI, click on your application, then click the "Refresh" button while holding Shift (or click the dropdown and select "Hard Refresh"). This invalidates the repo-server cache for that application.

## Method 2: Clear the Repo-Server Cache

If hard refresh does not work, you can clear the entire repo-server cache.

```bash
# The repo-server stores its cache in a Redis instance
# You can flush the cache by restarting the repo-server
kubectl -n argocd rollout restart deployment argocd-repo-server

# Or if you are using Redis, flush it directly
kubectl -n argocd exec -it deployment/argocd-redis -- redis-cli FLUSHALL
```

Note that flushing Redis affects all applications, not just the one you are troubleshooting. All manifests will be regenerated on the next sync cycle.

## Method 3: Verify Your Values File Configuration

Double-check that your Application spec correctly references the values files.

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: my-app
  namespace: argocd
spec:
  source:
    repoURL: https://github.com/my-org/my-repo.git
    targetRevision: main
    path: charts/my-app
    helm:
      # Values files are relative to the chart path
      valueFiles:
        - values.yaml
        - values-production.yaml
      # Or specify values inline (these take precedence)
      values: |
        replicaCount: 3
        image:
          tag: v1.2.3
```

A common mistake is specifying the values file path relative to the repo root instead of relative to the chart path. If your chart is at `charts/my-app/` and your values file is at `charts/my-app/values-production.yaml`, then the `valueFiles` entry should be just `values-production.yaml`.

If your values file lives outside the chart directory, use the `$values` reference.

```yaml
spec:
  sources:
    - repoURL: https://github.com/my-org/my-repo.git
      targetRevision: main
      ref: values
    - repoURL: https://github.com/my-org/helm-charts.git
      targetRevision: main
      path: charts/my-app
      helm:
        valueFiles:
          - $values/environments/production/values.yaml
```

The multi-source Application approach (using `sources` instead of `source`) lets you pull values from a different repo or a different path in the same repo.

## Method 4: Configure Git Webhooks

If ArgoCD consistently takes a long time to detect changes, set up Git webhooks to notify ArgoCD immediately when commits are pushed.

```bash
# Create a webhook secret
kubectl -n argocd patch secret argocd-secret \
  -p '{"stringData": {"webhook.github.secret": "my-webhook-secret"}}'
```

Then in your GitHub repo settings, add a webhook:

- **Payload URL**: `https://argocd.example.com/api/webhook`
- **Content type**: `application/json`
- **Secret**: `my-webhook-secret`
- **Events**: Push events

For GitLab, the configuration is similar but uses a different secret key.

```bash
kubectl -n argocd patch secret argocd-secret \
  -p '{"stringData": {"webhook.gitlab.secret": "my-webhook-secret"}}'
```

## Method 5: Reduce the Polling Interval

If webhooks are not an option, reduce the Git polling interval to detect changes faster.

```yaml
# In argocd-cm ConfigMap
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cm
  namespace: argocd
data:
  # Reduce from default 180 seconds (3 minutes) to 60 seconds
  timeout.reconciliation: "60"
```

Be careful with very low intervals on large installations. Each poll triggers a Git fetch, and if you have hundreds of applications, this can put significant load on both the repo-server and your Git host.

## Method 6: Use Helm Parameters Instead of Values Files

For individual value overrides, you can use the `parameters` field instead of values files. These are applied directly and do not depend on file caching.

```yaml
spec:
  source:
    repoURL: https://github.com/my-org/helm-charts.git
    targetRevision: main
    path: charts/my-app
    helm:
      parameters:
        - name: image.tag
          value: v1.2.4
        - name: replicaCount
          value: "5"
```

Parameters specified this way override values from both `values.yaml` and any `valueFiles` entries.

## Method 7: Check for Helm Dependency Issues

If your chart has dependencies defined in `Chart.yaml`, ArgoCD needs to run `helm dependency build` before rendering templates. If the dependencies are not resolving correctly, the values might not be applied as expected.

```bash
# Check if the chart has dependencies
kubectl -n argocd logs deployment/argocd-repo-server | grep -i "dependency\|helm"

# You can also check the Application's manifest generation status
argocd app manifests my-app --source live
argocd app manifests my-app --source git
```

Compare the live and git manifests to see exactly what differs.

## Debugging Manifest Generation

When you need to understand exactly what ArgoCD is generating from your Helm chart, use the diff view.

```bash
# Show the diff between what is in Git and what is running
argocd app diff my-app

# Show the full generated manifests
argocd app manifests my-app
```

You can also reproduce the manifest generation locally to verify your values are being applied correctly.

```bash
# Reproduce what ArgoCD does locally
helm template my-app ./charts/my-app \
  -f ./charts/my-app/values.yaml \
  -f ./charts/my-app/values-production.yaml
```

If the local output looks correct but ArgoCD shows different manifests, the issue is definitely caching or a path mismatch.

## Monitoring for Drift

To catch situations where ArgoCD is not picking up changes, set up monitoring on the sync status of your applications. If an application stays "Synced" when you know there are pending changes, that is a signal that something is wrong with change detection.

[OneUptime](https://oneuptime.com) can help you monitor ArgoCD application health and sync status, alerting you when applications are not syncing as expected. This is especially useful in production environments where delayed syncs can mean running outdated configurations.

The key takeaway is that ArgoCD caches aggressively for performance, and understanding the caching layers - Git polling, repo-server manifest cache, and Redis - helps you know where to look when changes are not being picked up.
