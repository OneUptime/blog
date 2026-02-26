# How to Force ArgoCD to Re-Read Helm Values from Git

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Helm

Description: Learn how to force ArgoCD to re-read Helm values files from Git when changes are not being picked up, with solutions for caching and refresh issues.

---

You updated your Helm values file in Git, pushed the commit, and ArgoCD still shows the old values. The application appears in sync, but the deployed resources do not reflect your changes. This is a surprisingly common issue, and it has several possible causes ranging from Git caching to Helm chart versioning behavior.

This guide covers every reason ArgoCD might not pick up your Helm values changes and how to fix each one.

## Why ArgoCD Might Miss Helm Values Changes

ArgoCD periodically polls your Git repository (default: every 3 minutes) to detect changes. When it detects a new commit, it re-renders the manifests using the Helm values and compares them to the live state. If the rendered output is the same, ArgoCD considers the application in sync.

There are several scenarios where this process can break down:

1. Git repository cache has not refreshed yet
2. The values file path is incorrect in the Application spec
3. ArgoCD is using a cached version of the Helm chart
4. The Helm chart version has not changed (for chart repositories)
5. ArgoCD manifest cache is stale

## Solution 1: Force a Hard Refresh

The quickest fix is to force ArgoCD to clear its cache and re-read everything from Git:

```bash
# Hard refresh clears the manifest cache and re-reads from Git
argocd app get my-app --hard-refresh
```

You can also do this from the UI by clicking the "Refresh" button while holding Shift, or by clicking the dropdown arrow next to Refresh and selecting "Hard Refresh."

This tells ArgoCD to discard its cached manifests and re-clone the repository, re-read all values files, and re-render the templates.

## Solution 2: Check Your Values File Path

A common cause of values not being picked up is an incorrect file path in the Application spec. ArgoCD resolves values file paths relative to the chart directory, not the repository root.

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: my-app
  namespace: argocd
spec:
  source:
    repoURL: https://github.com/org/repo.git
    targetRevision: main
    path: charts/my-app
    helm:
      # Path is relative to the chart directory (charts/my-app/)
      valueFiles:
        - values.yaml
        - values-production.yaml
```

If your repository structure looks like this:

```
repo/
  charts/
    my-app/
      Chart.yaml
      values.yaml
      templates/
  environments/
    production/
      values.yaml
```

And you want to use `environments/production/values.yaml`, you need to reference it relative to the chart path:

```yaml
helm:
  valueFiles:
    # Go up two directories from charts/my-app/ to reach repo root
    - ../../environments/production/values.yaml
```

Alternatively, use the `$values` reference if your values are in a different repository:

```yaml
spec:
  sources:
    - repoURL: https://github.com/org/helm-charts.git
      targetRevision: main
      path: charts/my-app
      helm:
        valueFiles:
          - $values/production/values.yaml
    - repoURL: https://github.com/org/config-repo.git
      targetRevision: main
      ref: values
```

## Solution 3: Clear the Repository Cache

ArgoCD caches Git repository content to avoid excessive cloning. Sometimes this cache gets stale:

```bash
# List all repository caches
kubectl exec -n argocd deployment/argocd-repo-server -- ls /tmp

# The nuclear option - delete the repo server's cache
kubectl delete pods -n argocd -l app.kubernetes.io/name=argocd-repo-server
```

A less disruptive approach is to invalidate the cache for a specific repository:

```bash
# Force ArgoCD to re-fetch the repository
argocd repo get https://github.com/org/repo.git
argocd app get my-app --refresh
```

## Solution 4: Handle Helm Chart Repository Caching

If you are using a Helm chart from a chart repository (not a Git repo), ArgoCD has a separate caching layer for chart versions:

```yaml
spec:
  source:
    repoURL: https://charts.example.com
    chart: my-app
    targetRevision: 1.2.3
    helm:
      valueFiles:
        - values.yaml
```

In this case, the `targetRevision` is the chart version. If you update values in Git but the chart version has not changed, ArgoCD may use the cached chart. Options include:

1. Bump the chart version in `Chart.yaml` for every change
2. Use a Git repository source instead of a chart repository
3. Use the `--helm-refresh` flag when refreshing

```bash
# Specifically refresh helm chart cache
argocd app get my-app --hard-refresh
```

## Solution 5: Use the Refresh Annotation

You can force a refresh programmatically by adding an annotation to the Application resource:

```bash
# Add the refresh annotation
kubectl annotate application my-app -n argocd \
  argocd.argoproj.io/refresh=hard --overwrite
```

This is useful in CI/CD pipelines where you want to ensure ArgoCD picks up changes immediately after a push:

```yaml
# In your CI/CD pipeline (e.g., GitHub Actions)
- name: Trigger ArgoCD Refresh
  run: |
    kubectl annotate application my-app -n argocd \
      argocd.argoproj.io/refresh=hard --overwrite
```

## Solution 6: Configure Webhooks for Instant Detection

Instead of relying on polling, configure Git webhooks so ArgoCD detects changes immediately:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cm
  namespace: argocd
data:
  # Reduce polling interval or set to 0 if using webhooks
  timeout.reconciliation: 0
```

Set up a webhook in your Git provider pointing to:

```
https://argocd.example.com/api/webhook
```

With webhooks configured, ArgoCD will receive push notifications and immediately refresh the affected applications.

## Solution 7: Check for Helm Value Override Conflicts

If you are using both `valueFiles` and inline `values` in your Application spec, the inline values take precedence and may override your file changes:

```yaml
spec:
  source:
    helm:
      valueFiles:
        - values.yaml
      # These inline values override anything in values.yaml
      values: |
        replicaCount: 3
        image:
          tag: latest
```

If you changed `replicaCount` in `values.yaml` to 5, but the inline `values` block sets it to 3, the inline value wins. Check for any inline overrides:

```bash
# Check the Application spec for inline values
argocd app get my-app -o yaml | grep -A 20 "helm:"
```

## Solution 8: Increase Repo Server Resources

If your repository is large or has many Helm charts, the repo server might be running out of memory or timing out before it can process all the values:

```yaml
# Increase repo server resources
repoServer:
  resources:
    requests:
      cpu: 500m
      memory: 512Mi
    limits:
      cpu: "2"
      memory: 2Gi
  # Increase the exec timeout for large repos
  env:
    - name: ARGOCD_EXEC_TIMEOUT
      value: "300"
```

## Debugging Checklist

When Helm values changes are not being picked up, work through this checklist:

```bash
# 1. Verify the commit is in the target branch
git log --oneline -5 origin/main

# 2. Check what ArgoCD sees as the current revision
argocd app get my-app | grep "Target"

# 3. Force a hard refresh
argocd app get my-app --hard-refresh

# 4. Check repo server logs for errors
kubectl logs -n argocd deployment/argocd-repo-server --tail=50

# 5. Verify the rendered manifests
argocd app manifests my-app --source live
argocd app manifests my-app --source git

# 6. Diff to see if changes are detected
argocd app diff my-app
```

The most common fix is simply doing a hard refresh. But if you find yourself doing hard refreshes repeatedly, set up webhooks and check your values file paths. Most persistent issues come from incorrect relative paths in `valueFiles` or conflicts between inline values and file-based values. Once you have the paths correct and webhooks configured, ArgoCD should pick up Helm values changes within seconds of a Git push.
