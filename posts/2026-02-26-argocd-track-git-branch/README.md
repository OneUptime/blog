# How to Track a Git Branch in ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Git, Deployments

Description: Learn how to configure ArgoCD applications to track a specific Git branch for automatic synchronization and continuous delivery workflows.

---

When you set up an ArgoCD application, one of the first decisions you need to make is what revision of your Git repository the application should follow. Tracking a Git branch is the most common approach, especially for environments like development and staging where you want continuous delivery of the latest changes.

In this guide, we will walk through how to configure ArgoCD to track a Git branch, discuss the implications of this approach, and cover some practical patterns you should know.

## How Branch Tracking Works in ArgoCD

ArgoCD polls your Git repository at regular intervals (default is 3 minutes) or receives webhook notifications to detect changes. When you configure an application to track a branch, ArgoCD resolves the branch name to its latest commit SHA and compares the desired state from that commit against the live state in your cluster.

If there is a difference, the application shows as "OutOfSync." If you have auto-sync enabled, ArgoCD will automatically apply those changes to your cluster.

The key thing to understand is that branch tracking is dynamic. Every time ArgoCD checks, it resolves the branch to whatever commit it currently points to. This means your application always follows the tip of the branch.

## Configuring Branch Tracking via the CLI

The simplest way to create an application that tracks a branch is with the `argocd` CLI:

```bash
# Create an application tracking the 'develop' branch
argocd app create my-app \
  --repo https://github.com/myorg/my-manifests.git \
  --path k8s/overlays/dev \
  --dest-server https://kubernetes.default.svc \
  --dest-namespace my-namespace \
  --revision develop
```

The `--revision` flag is where you specify the branch name. If you omit it, ArgoCD defaults to `HEAD`, which typically resolves to the default branch (usually `main` or `master`).

## Configuring Branch Tracking via Application Manifest

Most teams manage their ArgoCD applications declaratively. Here is an Application manifest that tracks a branch:

```yaml
# application.yaml - tracks the 'develop' branch
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: my-app
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/myorg/my-manifests.git
    # This is where you set the branch to track
    targetRevision: develop
    path: k8s/overlays/dev
  destination:
    server: https://kubernetes.default.svc
    namespace: my-namespace
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
```

The `targetRevision` field under `source` is what controls which branch, tag, or commit ArgoCD follows. Setting it to a branch name like `develop`, `main`, or `feature/new-login` tells ArgoCD to continuously track the tip of that branch.

## Common Branch Tracking Patterns

### Environment-per-Branch

A widely used pattern is mapping branches to environments:

```yaml
# dev-app.yaml - tracks develop branch
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: my-app-dev
  namespace: argocd
spec:
  source:
    repoURL: https://github.com/myorg/my-manifests.git
    targetRevision: develop
    path: k8s/overlays/dev
  destination:
    server: https://kubernetes.default.svc
    namespace: dev
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
---
# staging-app.yaml - tracks main branch
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: my-app-staging
  namespace: argocd
spec:
  source:
    repoURL: https://github.com/myorg/my-manifests.git
    targetRevision: main
    path: k8s/overlays/staging
  destination:
    server: https://kubernetes.default.svc
    namespace: staging
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
```

### ApplicationSet with Branch Tracking

You can also use an ApplicationSet to automatically generate applications for branches using the Git generator:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: my-app-branches
  namespace: argocd
spec:
  generators:
    - git:
        repoURL: https://github.com/myorg/my-manifests.git
        revision: HEAD
        directories:
          - path: k8s/overlays/*
  template:
    metadata:
      name: 'my-app-{{path.basename}}'
    spec:
      source:
        repoURL: https://github.com/myorg/my-manifests.git
        targetRevision: develop
        path: '{{path}}'
      destination:
        server: https://kubernetes.default.svc
        namespace: '{{path.basename}}'
```

## Verifying Your Branch Tracking Configuration

After creating the application, verify that ArgoCD is tracking the correct branch:

```bash
# Check the application details
argocd app get my-app

# Look for the 'Target Revision' in the output
# It should show your branch name, e.g., 'develop'

# You can also check what commit ArgoCD has resolved the branch to
argocd app get my-app -o json | jq '.status.sync.revision'
```

## Speeding Up Branch Detection

By default, ArgoCD polls repositories every 3 minutes. If you want faster detection of branch changes, you have two options.

First, you can reduce the polling interval in the ArgoCD ConfigMap:

```yaml
# argocd-cm ConfigMap
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cm
  namespace: argocd
data:
  # Reduce polling interval to 1 minute
  timeout.reconciliation: "60s"
```

Second, and recommended, you can set up Git webhooks so ArgoCD is notified immediately when a push happens:

```bash
# The webhook URL for your ArgoCD instance
# POST https://argocd.example.com/api/webhook
# ArgoCD supports GitHub, GitLab, Bitbucket, and generic Git webhooks
```

## When to Use Branch Tracking

Branch tracking works best for:

- **Development environments** where you want continuous deployment of the latest code
- **Staging environments** that follow the main branch before release
- **Feature branch environments** for preview deployments

It is less ideal for production environments. For production, you should consider tracking a Git tag or pinning to a specific commit. This gives you an explicit promotion step and makes rollbacks straightforward. You can read more about that approach in our guide on [how to track a Git tag in ArgoCD](https://oneuptime.com/blog/post/2026-02-26-argocd-track-git-tag/view).

## Troubleshooting Branch Tracking Issues

If your application is not picking up changes from the branch, check these things:

1. **Verify the branch exists**: Make sure the branch name in `targetRevision` matches exactly (it is case-sensitive).

2. **Check repository connectivity**: Run `argocd repo list` to see if ArgoCD can reach the repository.

3. **Look at the application events**: Run `argocd app get my-app` and check the conditions section for any errors.

4. **Force a refresh**: You can manually trigger ArgoCD to re-check the repository:

```bash
# Hard refresh - forces ArgoCD to re-fetch the repo
argocd app get my-app --hard-refresh
```

5. **Check webhook delivery** (if using webhooks): Look at your Git provider's webhook delivery logs to ensure payloads are being sent and accepted.

## Summary

Tracking a Git branch in ArgoCD is straightforward - set the `targetRevision` field in your Application spec to the branch name. Combined with auto-sync, this gives you a continuous delivery pipeline where every push to the branch automatically updates your cluster. For production environments, pair this with tag-based or commit-pinned tracking to maintain tighter control over what gets deployed and when.
