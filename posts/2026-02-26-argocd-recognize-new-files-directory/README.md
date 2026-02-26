# How to Get ArgoCD to Recognize New Files in a Directory

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Configuration, Troubleshooting

Description: Understand why ArgoCD may not detect new manifest files added to a directory and learn how to configure it to pick up changes automatically.

---

You added a new Kubernetes manifest file to your Git repository, pushed it, and ArgoCD does not seem to notice. The application still shows as "Synced" even though there is a brand new resource that should be deployed. This behavior confuses a lot of people because ArgoCD is supposed to track everything in the specified path.

Let me explain why this happens and how to make sure ArgoCD picks up new files every time.

## How ArgoCD Discovers Files

ArgoCD uses the `path` field in the Application spec to determine which directory to look at in your Git repository. When it processes this directory, it reads all YAML and JSON files in that directory and treats them as Kubernetes manifests.

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
    path: manifests/production
```

With this configuration, ArgoCD reads every `.yaml`, `.yml`, and `.json` file in `manifests/production/`. When you add a new file to this directory and push to the `main` branch, ArgoCD should detect it on the next refresh cycle.

So why does it sometimes miss new files?

## Common Reason 1: Caching and Refresh Timing

The most common reason is simply timing. ArgoCD does not watch your Git repo in real-time. It polls at a configurable interval (default 3 minutes) or reacts to webhooks.

```bash
# Force ArgoCD to refresh immediately
argocd app get my-app --hard-refresh

# Or trigger a refresh from the UI (click Refresh then Hard Refresh)
```

If you do not have webhooks configured, you may need to wait up to 3 minutes for ArgoCD to detect the change. Set up webhooks for instant detection.

```bash
# Check the current reconciliation timeout
kubectl -n argocd get configmap argocd-cm -o jsonpath='{.data.timeout\.reconciliation}'
```

## Common Reason 2: Directory Recursion Is Disabled

By default, ArgoCD only reads files in the specified directory, not in subdirectories. If you added a new file in a subdirectory, ArgoCD will not see it unless you enable recursive directory reading.

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
    path: manifests/production
    directory:
      recurse: true
```

The `directory.recurse: true` setting tells ArgoCD to scan all subdirectories as well. This is especially important if you organize manifests into subdirectories like `manifests/production/networking/`, `manifests/production/apps/`, etc.

## Common Reason 3: Include/Exclude Patterns

ArgoCD supports include and exclude patterns that control which files are processed. If you have these configured, new files might be filtered out.

```yaml
spec:
  source:
    path: manifests/production
    directory:
      recurse: true
      # Only include files matching this pattern
      include: '*.yaml'
      # Exclude files matching this pattern
      exclude: '{config.yaml,secret.yaml}'
```

If your new file does not match the include pattern or matches the exclude pattern, ArgoCD will ignore it. Check your Application spec for these settings.

```bash
# View the current Application spec
kubectl -n argocd get application my-app -o yaml | grep -A 10 directory
```

## Common Reason 4: Kustomize, Helm, or Jsonnet Configuration

If your Application uses Kustomize, Helm, or Jsonnet instead of plain manifests, the file discovery behavior is different.

For **Kustomize** applications, ArgoCD only processes files referenced in `kustomization.yaml`. Adding a new manifest file to the directory is not enough - you must also add it to the resources list in `kustomization.yaml`.

```yaml
# kustomization.yaml - new files must be listed here
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - deployment.yaml
  - service.yaml
  - new-configmap.yaml  # Must add this line for the new file
```

For **Helm** applications, ArgoCD renders templates from the `templates/` directory. New template files are automatically picked up, but new values files need to be referenced in the Application spec.

For **Jsonnet** applications, ArgoCD processes the entry point file specified in the Application configuration. New Jsonnet files need to be imported from the main file.

## Common Reason 5: Wrong Branch or Path

Sometimes the issue is simpler than expected - you pushed to the wrong branch or the path does not match.

```bash
# Verify what branch and path the Application is watching
kubectl -n argocd get application my-app -o jsonpath='{.spec.source.targetRevision}'
kubectl -n argocd get application my-app -o jsonpath='{.spec.source.path}'

# Verify the file exists in Git on the right branch
git ls-tree -r --name-only origin/main | grep manifests/production/
```

## Common Reason 6: ArgoCD Allow and Deny Files

ArgoCD supports `.argocd-allow` and `.argocd-deny` files in the application source directory. These files control which resources ArgoCD manages, and they might be filtering out your new file.

```bash
# Check for ArgoCD allow/deny files
git show origin/main:manifests/production/.argocd-allow 2>/dev/null
git show origin/main:manifests/production/.argocd-deny 2>/dev/null
```

## Debugging: See What ArgoCD Detects

To verify exactly what files and manifests ArgoCD is detecting, use the manifest generation feature.

```bash
# Show all manifests that ArgoCD generates from the source
argocd app manifests my-app --source git

# Compare with what is currently running
argocd app manifests my-app --source live

# Show the diff
argocd app diff my-app
```

If your new file's resources appear in the git manifests but not in the live manifests, ArgoCD has detected the file but has not synced it yet. Check if auto-sync is enabled.

```bash
# Check auto-sync status
kubectl -n argocd get application my-app -o jsonpath='{.spec.syncPolicy}'
```

If auto-sync is not enabled, you need to manually trigger a sync.

```bash
argocd app sync my-app
```

## Setting Up Proper File Detection

For the most reliable file detection, here is a recommended Application configuration that handles most scenarios.

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
    path: manifests/production
    directory:
      recurse: true
      include: '{*.yaml,*.yml,*.json}'
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
      - CreateNamespace=true
```

The `prune: true` setting is particularly important. It tells ArgoCD to not only deploy new resources when files are added, but also to delete resources when files are removed. Without pruning, ArgoCD will detect new files but will not clean up removed ones.

## Monitoring File Detection

If you frequently add new manifests and need reliable detection, set up webhooks and reduce the reconciliation timeout. Additionally, monitor your ArgoCD instance to make sure applications are staying in sync.

[OneUptime](https://oneuptime.com) can monitor ArgoCD application sync status and alert you when applications are out of sync for longer than expected, which helps catch file detection issues early.

The bottom line is that ArgoCD is designed to detect new files automatically for plain manifest directories. When it does not, the issue is usually caching, directory recursion settings, or the use of tools like Kustomize that require explicit file references. Check these common causes systematically and you will find the problem quickly.
